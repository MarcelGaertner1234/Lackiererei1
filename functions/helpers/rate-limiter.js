/**
 * ✅ BUG #2 FIX: OpenAI API Rate Limiting
 *
 * Purpose: Server-side rate limiting for OpenAI API calls (GPT-4, Whisper, TTS)
 * Risk Level: MEDIUM-HIGH (cost control vs user experience)
 *
 * Features:
 * - Per-user, per-werkstatt rate limiting
 * - Daily reset at midnight UTC
 * - Transaction-safe counter updates (no race conditions)
 * - Configurable limits per feature type
 * - Admin override capabilities
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

const admin = require('firebase-admin');

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

/**
 * Default rate limits (requests per day)
 * Can be overridden per user in Firestore
 */
const DEFAULT_LIMITS = {
    aiChatDaily: 200,      // Start HIGH, reduce gradually (final: 50)
    whisperDaily: 100,     // Start HIGH, reduce gradually (final: 20)
    ttsDaily: 100,         // Start HIGH, reduce gradually (final: 20)
    pdfVisionDaily: 50     // Start HIGH, reduce gradually (final: 10)
};

/**
 * Role-based limits (future feature)
 * TODO: Implement role-based limits in Phase 6
 */
const ROLE_LIMITS = {
    admin: {
        aiChatDaily: 200,
        whisperDaily: 100,
        ttsDaily: 100,
        pdfVisionDaily: 50
    },
    werkstatt: {
        aiChatDaily: 200,
        whisperDaily: 100,
        ttsDaily: 100,
        pdfVisionDaily: 50
    },
    partner: {
        aiChatDaily: 100,
        whisperDaily: 50,
        ttsDaily: 50,
        pdfVisionDaily: 25
    }
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check and increment rate limit counter
 *
 * This is the PRIMARY function called by all Cloud Functions before OpenAI API calls
 *
 * @param {string} userId - Firebase Auth UID
 * @param {string} werkstattId - Werkstatt identifier (e.g., "mosbach")
 * @param {string} type - API type: 'aiChat', 'whisper', 'tts', 'pdfVision'
 * @returns {Promise<Object>} - { allowed: boolean, remaining: number, limit: number, resetAt: Date }
 *
 * @example
 * const result = await checkAndIncrementRateLimit('user123', 'mosbach', 'aiChat');
 * if (!result.allowed) {
 *   throw new Error(`Rate limit exceeded. Reset at ${result.resetAt}`);
 * }
 */
async function checkAndIncrementRateLimit(userId, werkstattId, type) {
    const db = admin.firestore();
    const docRef = db.collection(`rateLimits_${werkstattId}`).doc(userId);

    try {
        return await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            const now = new Date();

            // CASE 1: Document doesn't exist → Initialize
            if (!doc.exists) {
                const initialData = {
                    userId,
                    werkstattId,
                    aiChatCalls: type === 'aiChat' ? 1 : 0,
                    whisperCalls: type === 'whisper' ? 1 : 0,
                    ttsCalls: type === 'tts' ? 1 : 0,
                    pdfVisionCalls: type === 'pdfVision' ? 1 : 0,
                    limits: DEFAULT_LIMITS,
                    lastReset: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                transaction.set(docRef, initialData);

                return {
                    allowed: true,
                    remaining: DEFAULT_LIMITS[`${type}Daily`] - 1,
                    limit: DEFAULT_LIMITS[`${type}Daily`],
                    resetAt: getNextMidnightUTC()
                };
            }

            // CASE 2: Document exists → Check if reset needed
            const data = doc.data();
            const lastReset = data.lastReset?.toDate() || new Date(0);
            const needsReset = !isSameDay(now, lastReset);

            if (needsReset) {
                // Reset all counters (new day)
                const resetData = {
                    aiChatCalls: type === 'aiChat' ? 1 : 0,
                    whisperCalls: type === 'whisper' ? 1 : 0,
                    ttsCalls: type === 'tts' ? 1 : 0,
                    pdfVisionCalls: type === 'pdfVision' ? 1 : 0,
                    lastReset: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                transaction.update(docRef, resetData);

                const limit = data.limits?.[`${type}Daily`] || DEFAULT_LIMITS[`${type}Daily`];

                return {
                    allowed: true,
                    remaining: limit - 1,
                    limit: limit,
                    resetAt: getNextMidnightUTC()
                };
            }

            // CASE 3: Same day → Check limit
            const currentCount = data[`${type}Calls`] || 0;
            const limit = data.limits?.[`${type}Daily`] || DEFAULT_LIMITS[`${type}Daily`];

            if (currentCount >= limit) {
                // Limit exceeded
                return {
                    allowed: false,
                    remaining: 0,
                    limit: limit,
                    resetAt: getNextMidnightUTC(),
                    currentCount: currentCount
                };
            }

            // CASE 4: Increment counter
            transaction.update(docRef, {
                [`${type}Calls`]: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                allowed: true,
                remaining: limit - currentCount - 1,
                limit: limit,
                resetAt: getNextMidnightUTC()
            };
        });
    } catch (error) {
        console.error('❌ [rate-limiter] Transaction failed:', error);

        // CRITICAL: On transaction failure, ALLOW request (fail-open)
        // Reason: Better to have extra costs than block legitimate users
        console.warn('⚠️ [rate-limiter] Failing open due to transaction error');

        return {
            allowed: true,
            remaining: DEFAULT_LIMITS[`${type}Daily`],
            limit: DEFAULT_LIMITS[`${type}Daily`],
            resetAt: getNextMidnightUTC(),
            error: error.message
        };
    }
}

/**
 * Get current quota for a user (read-only, no increment)
 *
 * Used by frontend to display remaining quota
 *
 * @param {string} userId - Firebase Auth UID
 * @param {string} werkstattId - Werkstatt identifier
 * @returns {Promise<Object>} - Quota information for all API types
 */
async function getQuota(userId, werkstattId) {
    const db = admin.firestore();
    const docRef = db.collection(`rateLimits_${werkstattId}`).doc(userId);

    try {
        const doc = await docRef.get();

        if (!doc.exists) {
            // User has never used API → return full quota
            return {
                aiChat: { used: 0, limit: DEFAULT_LIMITS.aiChatDaily, remaining: DEFAULT_LIMITS.aiChatDaily },
                whisper: { used: 0, limit: DEFAULT_LIMITS.whisperDaily, remaining: DEFAULT_LIMITS.whisperDaily },
                tts: { used: 0, limit: DEFAULT_LIMITS.ttsDaily, remaining: DEFAULT_LIMITS.ttsDaily },
                pdfVision: { used: 0, limit: DEFAULT_LIMITS.pdfVisionDaily, remaining: DEFAULT_LIMITS.pdfVisionDaily },
                resetAt: getNextMidnightUTC()
            };
        }

        const data = doc.data();
        const now = new Date();
        const lastReset = data.lastReset?.toDate() || new Date(0);
        const needsReset = !isSameDay(now, lastReset);

        if (needsReset) {
            // Counters will reset on next API call
            return {
                aiChat: { used: 0, limit: data.limits?.aiChatDaily || DEFAULT_LIMITS.aiChatDaily, remaining: data.limits?.aiChatDaily || DEFAULT_LIMITS.aiChatDaily },
                whisper: { used: 0, limit: data.limits?.whisperDaily || DEFAULT_LIMITS.whisperDaily, remaining: data.limits?.whisperDaily || DEFAULT_LIMITS.whisperDaily },
                tts: { used: 0, limit: data.limits?.ttsDaily || DEFAULT_LIMITS.ttsDaily, remaining: data.limits?.ttsDaily || DEFAULT_LIMITS.ttsDaily },
                pdfVision: { used: 0, limit: data.limits?.pdfVisionDaily || DEFAULT_LIMITS.pdfVisionDaily, remaining: data.limits?.pdfVisionDaily || DEFAULT_LIMITS.pdfVisionDaily },
                resetAt: getNextMidnightUTC()
            };
        }

        // Return current usage
        return {
            aiChat: {
                used: data.aiChatCalls || 0,
                limit: data.limits?.aiChatDaily || DEFAULT_LIMITS.aiChatDaily,
                remaining: (data.limits?.aiChatDaily || DEFAULT_LIMITS.aiChatDaily) - (data.aiChatCalls || 0)
            },
            whisper: {
                used: data.whisperCalls || 0,
                limit: data.limits?.whisperDaily || DEFAULT_LIMITS.whisperDaily,
                remaining: (data.limits?.whisperDaily || DEFAULT_LIMITS.whisperDaily) - (data.whisperCalls || 0)
            },
            tts: {
                used: data.ttsCalls || 0,
                limit: data.limits?.ttsDaily || DEFAULT_LIMITS.ttsDaily,
                remaining: (data.limits?.ttsDaily || DEFAULT_LIMITS.ttsDaily) - (data.ttsCalls || 0)
            },
            pdfVision: {
                used: data.pdfVisionCalls || 0,
                limit: data.limits?.pdfVisionDaily || DEFAULT_LIMITS.pdfVisionDaily,
                remaining: (data.limits?.pdfVisionDaily || DEFAULT_LIMITS.pdfVisionDaily) - (data.pdfVisionCalls || 0)
            },
            resetAt: getNextMidnightUTC()
        };
    } catch (error) {
        console.error('❌ [rate-limiter] getQuota failed:', error);

        // Return default limits on error
        return {
            aiChat: { used: 0, limit: DEFAULT_LIMITS.aiChatDaily, remaining: DEFAULT_LIMITS.aiChatDaily },
            whisper: { used: 0, limit: DEFAULT_LIMITS.whisperDaily, remaining: DEFAULT_LIMITS.whisperDaily },
            tts: { used: 0, limit: DEFAULT_LIMITS.ttsDaily, remaining: DEFAULT_LIMITS.ttsDaily },
            pdfVision: { used: 0, limit: DEFAULT_LIMITS.pdfVisionDaily, remaining: DEFAULT_LIMITS.pdfVisionDaily },
            resetAt: getNextMidnightUTC(),
            error: error.message
        };
    }
}

/**
 * Reset rate limits for specific user (Admin override)
 *
 * @param {string} userId - Firebase Auth UID
 * @param {string} werkstattId - Werkstatt identifier
 * @returns {Promise<boolean>} - Success status
 */
async function resetUserRateLimit(userId, werkstattId) {
    const db = admin.firestore();
    const docRef = db.collection(`rateLimits_${werkstattId}`).doc(userId);

    try {
        await docRef.update({
            aiChatCalls: 0,
            whisperCalls: 0,
            ttsCalls: 0,
            pdfVisionCalls: 0,
            lastReset: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ [rate-limiter] Reset rate limit for user ${userId} in ${werkstattId}`);
        return true;
    } catch (error) {
        console.error('❌ [rate-limiter] resetUserRateLimit failed:', error);
        return false;
    }
}

/**
 * Reset all rate limits for a werkstatt (Daily scheduler)
 * Called by Cloud Scheduler at midnight UTC
 *
 * @param {string} werkstattId - Werkstatt identifier
 * @returns {Promise<number>} - Number of users reset
 */
async function resetAllRateLimits(werkstattId) {
    const db = admin.firestore();
    const collectionRef = db.collection(`rateLimits_${werkstattId}`);

    try {
        const snapshot = await collectionRef.get();

        if (snapshot.empty) {
            console.log(`ℹ️ [rate-limiter] No rate limits to reset for ${werkstattId}`);
            return 0;
        }

        // Batch update (max 500 per batch)
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                aiChatCalls: 0,
                whisperCalls: 0,
                ttsCalls: 0,
                pdfVisionCalls: 0,
                lastReset: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });

        await batch.commit();

        console.log(`✅ [rate-limiter] Reset ${count} rate limits for ${werkstattId}`);
        return count;
    } catch (error) {
        console.error(`❌ [rate-limiter] resetAllRateLimits failed for ${werkstattId}:`, error);
        throw error;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if two dates are on the same day (UTC)
 */
function isSameDay(date1, date2) {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
}

/**
 * Get next midnight UTC
 */
function getNextMidnightUTC() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    ));
    return tomorrow;
}

/**
 * Format time until reset (for user display)
 */
function formatTimeUntilReset() {
    const now = new Date();
    const midnight = getNextMidnightUTC();
    const msUntilReset = midnight - now;

    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}min`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    checkAndIncrementRateLimit,
    getQuota,
    resetUserRateLimit,
    resetAllRateLimits,
    formatTimeUntilReset,
    DEFAULT_LIMITS,
    ROLE_LIMITS
};
