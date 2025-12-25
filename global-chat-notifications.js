// ========================================
// GLOBAL CHAT NOTIFICATION SYSTEM
// ========================================
// Für alle KFZ-Werkstatt Seiten
// Zeigt Floating Chat-Bell + Toast Notifications

(function() {
    'use strict';

    // Konfiguration
    const CONFIG = {
        checkInterval: 30000, // 30 Sekunden
        toastDuration: 5000, // 5 Sekunden
        maxToasts: 3,
        enableSound: false, // Optional: Sound bei neuer Nachricht
        bellPosition: 'bottom-right' // bottom-right, bottom-left, top-right
    };

    // State
    let unreadCount = 0;
    let lastCheck = null;
    let firebaseListener = null;
    let toastQueue = [];

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

    function initChatNotifications() {
        // Prüfe ob Firebase verfügbar ist
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            if (window.DEBUG) console.warn('⚠️ Firebase nicht verfügbar - Chat-Notifications deaktiviert');
            return;
        }

        // Last check aus LocalStorage laden
        lastCheck = localStorage.getItem('chat_notifications_last_check') || new Date().toISOString();

        // UI erstellen
        createFloatingBell();
        createToastContainer();

        // Warte auf Auth State bevor Listener gestartet werden
        waitForAuthAndStartListeners();
    }

    function waitForAuthAndStartListeners() {
        // Prüfe ob Auth Manager und User verfügbar sind
        if (window.authManager && window.authManager.getCurrentUser()) {
            loadUnreadCount();
            startFirebaseListener();
        } else {
            // Warte max 10 Sekunden auf Auth
            let attempts = 0;
            const maxAttempts = 20;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window.authManager && window.authManager.getCurrentUser()) {
                    clearInterval(checkInterval);
                    loadUnreadCount();
                    startFirebaseListener();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    if (window.DEBUG) console.warn('⚠️ Auth Timeout - Chat-Listeners nicht gestartet');
                }
            }, 500);
        }
    }

    // ========================================
    // UI COMPONENTS
    // ========================================

    function createFloatingBell() {
        const bell = document.createElement('div');
        bell.id = 'globalChatBell';
        bell.className = 'global-chat-bell';
        bell.innerHTML = `
            <div class="bell-icon">🔔</div>
            <div class="bell-badge" id="globalChatBadge" style="display: none;">0</div>
        `;

        // Click Handler
        bell.addEventListener('click', () => {
            // Erkenne aktuellen Pfad und navigiere entsprechend
            const currentPath = window.location.pathname;
            if (currentPath.includes('partner-app/')) {
                safeNavigate('admin-anfragen.html');
            } else {
                safeNavigate('partner-app/admin-anfragen.html');
            }
        });

        document.body.appendChild(bell);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'globalToastContainer';
        container.className = 'global-toast-container';
        document.body.appendChild(container);
    }

    // ========================================
    // UNREAD COUNT
    // ========================================

    async function loadUnreadCount() {
        try {
            const db = firebase.firestore();
            const lastRead = localStorage.getItem('chat_notifications_last_check') || '0';

            // 🚀 PERF: Single collectionGroup query instead of N+1 pattern
            // Previously: 1 query for all anfragen + N queries for each chat = N+1 queries
            // Now: 1 collectionGroup query = 1 query total
            const chatSnapshot = await db.collectionGroup('chat')
                .where('sender', '==', 'partner')
                .where('timestamp', '>', lastRead)
                .limit(100) // Limit to prevent excessive reads
                .get();

            updateBellBadge(chatSnapshot.size);

        } catch (error) {
            // Fallback: Try without timestamp filter if index missing
            try {
                const db = firebase.firestore();
                const lastRead = localStorage.getItem('chat_notifications_last_check') || '0';

                const chatSnapshot = await db.collectionGroup('chat')
                    .where('sender', '==', 'partner')
                    .limit(100)
                    .get();

                // Client-side filter for timestamp
                const unreadMessages = chatSnapshot.docs.filter(doc =>
                    doc.data().timestamp > lastRead
                );

                updateBellBadge(unreadMessages.length);
            } catch (fallbackError) {
                if (window.DEBUG) console.error('❌ Fehler beim Laden der Unread-Counts:', fallbackError);
            }
        }
    }

    function updateBellBadge(count) {
        unreadCount = count;
        const badge = document.getElementById('globalChatBadge');
        const bell = document.getElementById('globalChatBell');

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
        const db = firebase.firestore();

        // 🚀 PERF: Register listener in registry to prevent memory leaks
        // Höre auf neue Nachrichten in allen chat Subcollections
        const unsubscribe = db.collectionGroup('chat')
            .where('sender', '==', 'partner')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const messageTime = new Date(message.timestamp);
                        const lastCheckTime = new Date(lastCheck);

                        // Nur Nachrichten seit letztem Check anzeigen
                        if (messageTime > lastCheckTime) {
                            handleNewMessage(message, change.doc.ref.parent.parent.id);
                        }
                    }
                });

                // Last check aktualisieren
                lastCheck = new Date().toISOString();
                localStorage.setItem('chat_notifications_last_check', lastCheck);
            }, (error) => {
                if (window.DEBUG) console.error('❌ Firebase Listener Error:', error);
            });

        // 🚀 PERF: Register listener for proper cleanup on navigation
        firebaseListener = unsubscribe;
        if (window.listenerRegistry) {
            window.listenerRegistry.register(unsubscribe, 'globalChatNotifications');
        }
    }

    async function handleNewMessage(message, anfrageId) {
        // Unread count erhöhen
        updateBellBadge(unreadCount + 1);

        // Pulse-Animation triggern
        triggerPulseAnimation();

        // Sound abspielen (optional)
        if (CONFIG.enableSound) {
            playNotificationSound();
        }

        // Anfrage-Details laden für Toast
        try {
            const anfrageDoc = await window.getCollection('partnerAnfragen').doc(anfrageId).get();
            if (anfrageDoc.exists) {
                const anfrage = anfrageDoc.data();
                showToast({
                    partnerName: anfrage.partnerName,
                    message: message.text,
                    anfrageId: anfrageId,
                    kennzeichen: anfrage.kennzeichen || anfrage.auftragsnummer
                });
            }
        } catch (error) {
            if (window.DEBUG) console.error('Fehler beim Laden der Anfrage-Details:', error);
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
        toast.className = 'global-toast';
        // 🔧 FIX (2025-12-11): XSS Protection - escapeHtml für User-Daten
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-icon">💬</div>
                <div class="toast-title">${escapeHtml(data.partnerName)}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="toast-body">
                <div class="toast-subtitle">${escapeHtml(data.kennzeichen)}</div>
                <div class="toast-message">${escapeHtml(truncateText(data.message, 60))}</div>
            </div>
            <div class="toast-action">
                <button class="toast-btn" onclick="openChat('${escapeHtml(data.anfrageId)}')">Antworten</button>
            </div>
        `;

        // Click Handler
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close') && !e.target.classList.contains('toast-btn')) {
                safeNavigate(`partner-app/admin-anfragen.html#anfrage-${data.anfrageId}`);
            }
        });

        const container = document.getElementById('globalToastContainer');
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
        const bell = document.getElementById('globalChatBell');
        bell.classList.add('pulse');
        setTimeout(() => {
            bell.classList.remove('pulse');
        }, 1000);
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
    window.openChat = function(anfrageId) {
        const currentPath = window.location.pathname;
        if (currentPath.includes('partner-app/')) {
            safeNavigate(`admin-anfragen.html#anfrage-${anfrageId}`);
        } else {
            safeNavigate(`partner-app/admin-anfragen.html#anfrage-${anfrageId}`);
        }
    };

    // ========================================
    // AUTO-INIT
    // ========================================

    // Init when Firebase is ready (via firebaseReady Event)
    window.addEventListener('firebaseReady', () => {
        initChatNotifications();
    });

    // Fallback: Falls Firebase bereits initialisiert ist (late load)
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        initChatNotifications();
    }

})();
