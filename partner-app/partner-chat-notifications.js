// ========================================
// PARTNER CHAT NOTIFICATION SYSTEM
// ========================================
// Für Partner/Kunden Seiten
// Zeigt Benachrichtigungen wenn Werkstatt antwortet

(function() {
    'use strict';

    // Konfiguration
    const CONFIG = {
        checkInterval: 30000, // 30 Sekunden
        toastDuration: 5000, // 5 Sekunden
        maxToasts: 3,
        enableSound: false, // Optional: Sound bei neuer Nachricht
        bellPosition: 'bottom-right'
    };

    // State
    let unreadCount = 0;
    let lastCheck = null;
    let firebaseListener = null;
    let chatListeners = []; // 🚀 PERF: Track nested listeners for cleanup
    let toastQueue = [];
    let partnerEmail = null;

    // 🔧 FIX (2025-12-11): XSS Protection Helper
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    function initPartnerChatNotifications() {
        // Prüfe ob Firebase verfügbar ist
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            return;
        }

        // Partner Email aus LocalStorage
        partnerEmail = localStorage.getItem('partner_email');
        if (!partnerEmail) {
            return;
        }

        // Last check aus LocalStorage laden
        lastCheck = localStorage.getItem('partner_chat_last_check') || new Date().toISOString();

        // UI erstellen
        createFloatingBell();
        createToastContainer();

        // Unread Count laden
        loadUnreadCount();

        // Firebase Listener starten
        startFirebaseListener();
    }

    // ========================================
    // UI COMPONENTS
    // ========================================

    function createFloatingBell() {
        const bell = document.createElement('div');
        bell.id = 'partnerChatBell';
        bell.className = 'partner-chat-bell';
        bell.innerHTML = `
            <div class="bell-icon">🔔</div>
            <div class="bell-badge" id="partnerChatBadge" style="display: none;">0</div>
        `;

        // Click Handler - bleibt auf meine-anfragen.html
        bell.addEventListener('click', () => {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('meine-anfragen.html')) {
                safeNavigate('meine-anfragen.html');
            } else {
                // Bereits auf meine-anfragen.html - scroll zu erstem unread
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        document.body.appendChild(bell);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'partnerToastContainer';
        container.className = 'partner-toast-container';
        document.body.appendChild(container);
    }

    // ========================================
    // UNREAD COUNT
    // ========================================

    async function loadUnreadCount() {
        try {
            const lastRead = localStorage.getItem('partner_chat_last_check') || '0';
            const db = firebase.firestore();

            // 🚀 PERF: Use collectionGroup query instead of N+1 pattern
            // This requires a composite index on (sender, timestamp) for the 'chat' collection group
            const chatSnapshot = await db.collectionGroup('chat')
                .where('sender', '==', 'werkstatt')
                .where('timestamp', '>', lastRead)
                .limit(100) // Limit to prevent excessive reads
                .get();

            // Filter to only count messages from this partner's anfragen
            // (collectionGroup returns all chats, we need to filter by parent anfrage)
            let totalUnread = 0;
            for (const doc of chatSnapshot.docs) {
                // Get parent anfrage reference
                const anfrageRef = doc.ref.parent.parent;
                if (anfrageRef) {
                    const anfrageDoc = await anfrageRef.get();
                    if (anfrageDoc.exists && anfrageDoc.data().partnerEmail === partnerEmail) {
                        totalUnread++;
                    }
                }
            }

            updateBellBadge(totalUnread);

        } catch (error) {
            // Graceful fallback - set badge to 0
            updateBellBadge(0);
        }
    }

    function updateBellBadge(count) {
        unreadCount = count;
        const badge = document.getElementById('partnerChatBadge');
        const bell = document.getElementById('partnerChatBell');

        if (!badge || !bell) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
            bell.classList.add('has-unread');
        } else {
            badge.style.display = 'none';
            bell.classList.remove('has-unread');
        }
    }

    // ========================================
    // FIREBASE LISTENER
    // ========================================

    function startFirebaseListener() {
        // 🚀 PERF: Cleanup any existing listeners first
        cleanupListeners();

        const anfrageCollection = window.getCollection('partnerAnfragen');

        // Listener auf Partner-Anfragen (nur IHRE Anfragen)
        const unsubscribe = anfrageCollection
            .where('partnerEmail', '==', partnerEmail)
            .limit(50) // 🚀 PERF: Limit to prevent excessive reads
            .onSnapshot((anfrageSnapshot) => {
                anfrageSnapshot.forEach((anfrageDoc) => {
                    const anfrageId = anfrageDoc.id;

                    try {
                        // Pro Anfrage: Listener auf chat subcollection
                        const chatCollection = anfrageCollection.doc(anfrageId).collection('chat');

                        const chatUnsubscribe = chatCollection
                            .where('sender', '==', 'werkstatt')
                            .orderBy('timestamp', 'desc')
                            .limit(10)
                            .onSnapshot((chatSnapshot) => {
                                chatSnapshot.docChanges().forEach((change) => {
                                    if (change.type === 'added') {
                                        const message = change.doc.data();
                                        const messageTime = new Date(message.timestamp);
                                        const lastCheckTime = new Date(lastCheck);

                                        // Nur Nachrichten seit letztem Check anzeigen
                                        if (messageTime > lastCheckTime) {
                                            handleNewMessage(message, anfrageId);
                                        }
                                    }
                                });
                            }, (error) => {
                                // Graceful Error Handling - silent fail
                            });

                        // 🚀 PERF: Track nested listener for cleanup
                        chatListeners.push(chatUnsubscribe);
                    } catch (error) {
                        // Silent fail
                    }
                });

                // Last check aktualisieren
                lastCheck = new Date().toISOString();
                localStorage.setItem('partner_chat_last_check', lastCheck);
            }, (error) => {
                // Graceful Error Handling - silent fail
            });

        // 🚀 PERF: Register main listener for proper cleanup
        firebaseListener = unsubscribe;
        if (window.listenerRegistry) {
            window.listenerRegistry.register(unsubscribe, 'partnerChatNotifications');
        }
    }

    // 🚀 PERF: Cleanup all listeners
    function cleanupListeners() {
        // Cleanup nested chat listeners
        chatListeners.forEach(unsubscribe => {
            try { unsubscribe(); } catch (e) {}
        });
        chatListeners = [];

        // Cleanup main listener
        if (firebaseListener) {
            try { firebaseListener(); } catch (e) {}
            firebaseListener = null;
        }
    }

    async function handleNewMessage(message, anfrageId) {
        // Prüfe ob Nachricht für diesen Partner ist
        try {
            const anfrageDoc = await window.getCollection('partnerAnfragen').doc(anfrageId).get();

            if (!anfrageDoc.exists) return;

            const anfrage = anfrageDoc.data();
            if (anfrage.partnerEmail !== partnerEmail) return; // Nicht für diesen Partner

            // Unread count erhöhen
            updateBellBadge(unreadCount + 1);

            // Pulse-Animation triggern
            triggerPulseAnimation();

            // Sound abspielen (optional)
            if (CONFIG.enableSound) {
                playNotificationSound();
            }

            // Toast anzeigen
            showToast({
                werkstattName: message.senderName || 'Auto-Lackierzentrum',
                message: message.text,
                anfrageId: anfrageId,
                kennzeichen: anfrage.kennzeichen || anfrage.auftragsnummer
            });

        } catch (error) {
            // Silent fail
        }
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    function showToast(data) {
        // Max Toasts check
        if (toastQueue.length >= CONFIG.maxToasts) {
            removeOldestToast();
        }

        const toast = document.createElement('div');
        toast.className = 'partner-toast';
        // 🔧 FIX (2025-12-11): XSS Protection - escapeHtml für User-Daten
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-icon">💬</div>
                <div class="toast-title">${escapeHtml(data.werkstattName)}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="toast-body">
                <div class="toast-subtitle">${escapeHtml(data.kennzeichen)}</div>
                <div class="toast-message">${escapeHtml(truncateText(data.message, 60))}</div>
            </div>
            <div class="toast-action">
                <button class="toast-btn" onclick="openPartnerChat('${escapeHtml(data.anfrageId)}')">Antworten</button>
            </div>
        `;

        // Click Handler
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close') && !e.target.classList.contains('toast-btn')) {
                safeNavigate(`meine-anfragen.html#anfrage-${data.anfrageId}`);
            }
        });

        const container = document.getElementById('partnerToastContainer');
        container.appendChild(toast);
        toastQueue.push(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            removeToast(toast);
        }, CONFIG.toastDuration);
    }

    function removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
            toastQueue = toastQueue.filter(t => t !== toast);
        }, 300);
    }

    function removeOldestToast() {
        if (toastQueue.length > 0) {
            removeToast(toastQueue[0]);
        }
    }

    // ========================================
    // ANIMATIONS & EFFECTS
    // ========================================

    function triggerPulseAnimation() {
        const bell = document.getElementById('partnerChatBell');
        if (bell) {
            bell.classList.add('pulse');
            setTimeout(() => {
                bell.classList.remove('pulse');
            }, 1000);
        }
    }

    function playNotificationSound() {
        // Optional: Kleiner Benachrichtigungston
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmm98OScSgoKWrHq7qVVEwlEnN/yu2sgBS2Bz/LUijQJF2S17edcSgkOUqTr7a5bGAo9lNrywmsfBSZ8y+/YjTcIDl2x6+ulXRIJQZvf8r1sIQUnfsvw240+CAdjuuvspVUSCj+Y3vLGYSICJnbI8d2ROQ');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }

    // ========================================
    // UTILITIES
    // ========================================

    function truncateText(text, maxLength) {
        // 🔧 FIX (2025-12-11): Null-Check für undefined/null text
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Global function für Toast-Buttons
    window.openPartnerChat = function(anfrageId) {
        safeNavigate(`meine-anfragen.html#anfrage-${anfrageId}`);
    };

    // ========================================
    // AUTO-INIT
    // ========================================

    // Init when Firebase is ready (via firebaseReady Event)
    window.addEventListener('firebaseReady', () => {
        initPartnerChatNotifications();
    });

    // Fallback: Falls Firebase bereits initialisiert ist (late load)
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        initPartnerChatNotifications();
    }

    // 🚀 PERF: Cleanup on page unload
    window.addEventListener('beforeunload', cleanupListeners);

})();
