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
    let toastQueue = [];
    let partnerEmail = null;

    // ========================================
    // INITIALIZATION
    // ========================================

    function initPartnerChatNotifications() {
        // Prüfe ob Firebase verfügbar ist
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.warn('⚠️ Firebase nicht verfügbar - Partner Chat-Notifications deaktiviert');
            return;
        }

        // Partner Email aus LocalStorage
        partnerEmail = localStorage.getItem('partner_email');
        if (!partnerEmail) {
            console.log('ℹ️ Partner nicht eingeloggt - Notifications deaktiviert');
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

        console.log('✅ Partner Chat-Notifications initialisiert');
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

            // Nur Anfragen des eingeloggten Partners laden (Multi-Tenant)
            const anfrageSnapshot = await window.getCollection('partnerAnfragen')
                .where('partnerEmail', '==', partnerEmail)
                .get();

            let totalUnread = 0;

            // Für jede Anfrage ungelesene Werkstatt-Nachrichten zählen
            for (const anfrageDoc of anfrageSnapshot.docs) {
                try {
                    const chatSnapshot = await window.getCollection('partnerAnfragen')
                        .doc(anfrageDoc.id)
                        .collection('chat')
                        .where('sender', '==', 'werkstatt')
                        .where('timestamp', '>', lastRead)
                        .get();

                    totalUnread += chatSnapshot.size;
                } catch (error) {
                    // ✅ FIX 9: Fallback ohne timestamp filter - auch absichern!
                    try {
                        const chatSnapshot = await window.getCollection('partnerAnfragen')
                            .doc(anfrageDoc.id)
                            .collection('chat')
                            .where('sender', '==', 'werkstatt')
                            .get();

                        const unreadMessages = chatSnapshot.docs.filter(doc =>
                            doc.data().timestamp > lastRead
                        );

                        totalUnread += unreadMessages.length;
                    } catch (fallbackError) {
                        // Permission denied oder anderer Fehler - überspringe diese Anfrage
                        console.warn(`⚠️ Kann Chat für Anfrage ${anfrageDoc.id} nicht laden:`, fallbackError.code);
                    }
                }
            }

            updateBellBadge(totalUnread);

        } catch (error) {
            // ✅ FIX 11: Permission-Denied graceful behandeln
            if (error.code === 'permission-denied') {
                console.log('ℹ️ Keine Berechtigung für Unread-Counts (Partner ohne Anfragen?)');
                updateBellBadge(0); // Badge auf 0 setzen
            } else {
                console.error('❌ Fehler beim Laden der Unread-Counts:', error);
            }
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
        const db = firebase.firestore();

        // 🆕 FIX: Statt collectionGroup - direkte partnerAnfragen Query
        // Höre auf ALLE Anfragen des Partners, dann pro Anfrage auf chat subcollection

        const anfrageCollection = window.getCollection('partnerAnfragen');

        // Listener auf Partner-Anfragen (nur IHRE Anfragen)
        firebaseListener = anfrageCollection
            .where('partnerEmail', '==', partnerEmail)
            .onSnapshot((anfrageSnapshot) => {
                anfrageSnapshot.forEach((anfrageDoc) => {
                    const anfrageId = anfrageDoc.id;

                    // ✅ FIX 10: Chat-Listener absichern gegen Permission-Errors
                    try {
                        // Pro Anfrage: Listener auf chat subcollection
                        const chatCollection = anfrageCollection.doc(anfrageId).collection('chat');

                        chatCollection
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
                                // Graceful Error Handling - keine Permission? Listener überspringen
                                if (error.code === 'permission-denied') {
                                    console.warn(`⚠️ Keine Berechtigung für Chat-Listener bei Anfrage ${anfrageId}`);
                                } else {
                                    console.error('Firebase Chat Listener Error:', error);
                                }
                            });
                    } catch (error) {
                        console.warn(`⚠️ Kann Chat-Listener für Anfrage ${anfrageId} nicht starten:`, error.code);
                    }
                });

                // Last check aktualisieren
                lastCheck = new Date().toISOString();
                localStorage.setItem('partner_chat_last_check', lastCheck);
            }, (error) => {
                // ✅ FIX 12: Permission-Denied graceful behandeln
                if (error.code === 'permission-denied') {
                    console.log('ℹ️ Keine Berechtigung für Anfragen-Listener (Partner ohne Anfragen?)');
                } else {
                    console.error('Firebase Anfragen Listener Error:', error);
                }
            });
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
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
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
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-icon">💬</div>
                <div class="toast-title">${data.werkstattName}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="toast-body">
                <div class="toast-subtitle">${data.kennzeichen}</div>
                <div class="toast-message">${truncateText(data.message, 60)}</div>
            </div>
            <div class="toast-action">
                <button class="toast-btn" onclick="openPartnerChat('${data.anfrageId}')">Antworten</button>
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
        audio.play().catch(e => console.log('Sound konnte nicht abgespielt werden:', e));
    }

    // ========================================
    // UTILITIES
    // ========================================

    function truncateText(text, maxLength) {
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
        console.log('🔔 Partner Chat-Notifications: firebaseReady empfangen');
        initPartnerChatNotifications();
    });

    // Fallback: Falls Firebase bereits initialisiert ist (late load)
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.log('🔔 Partner Chat-Notifications: Firebase bereits ready');
        initPartnerChatNotifications();
    }

})();
