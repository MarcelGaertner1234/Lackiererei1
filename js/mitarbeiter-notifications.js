/**
 * ============================================
 * MITARBEITER NOTIFICATIONS MANAGER
 * ============================================
 *
 * Manages notifications for employees (Mitarbeiter):
 * - Loads unread notifications from Firestore
 * - Displays toast notifications
 * - Integrates with AI Agent for speech output
 * - Marks notifications as read
 *
 * Architecture: Frontend → Firestore mitarbeiterNotifications_{werkstatt}
 * Language: German
 */

class MitarbeiterNotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.listener = null;
        this.db = null;
        this.werkstatt = null;
        this.userId = null;

        console.log('🔔 Mitarbeiter Notification Manager initialized');
    }

    /**
     * 🔧 FIX (2025-12-11): XSS Protection Helper
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Initialize the notification manager
     * Called after Firebase is ready and user is logged in
     */
    async initialize() {
        try {
            // Check if Firebase is ready
            if (!window.db) {
                console.error('❌ Firebase not initialized');
                return false;
            }

            this.db = window.db;

            // Get current user
            const currentUser = window.authManager?.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ No user logged in, skipping notification initialization');
                return false;
            }

            // Use mitarbeiterId (not uid) - getCurrentUser() returns { mitarbeiterId, werkstattId, ... }
            this.userId = currentUser.mitarbeiterId;
            this.werkstatt = currentUser.werkstattId || 'mosbach';

            console.log(`🔔 Initializing notifications for user: ${currentUser.name} (${this.werkstatt})`);

            // Load initial notifications
            await this.loadNotifications();

            // Setup real-time listener
            this.setupRealtimeListener();

            return true;
        } catch (error) {
            console.error('❌ Error initializing notification manager:', error);
            return false;
        }
    }

    /**
     * Load all unread notifications from Firestore
     */
    async loadNotifications() {
        try {
            if (!this.db || !this.userId || !this.werkstatt) {
                console.error('❌ Missing required data for loading notifications');
                return [];
            }

            const collectionName = `mitarbeiterNotifications_${this.werkstatt}`;
            console.log(`📥 Loading notifications from: ${collectionName}`);

            const snapshot = await this.db
                .collection(collectionName)
                .where('mitarbeiterId', '==', this.userId)
                .where('status', '==', 'unread')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            this.notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            this.unreadCount = this.notifications.length;

            console.log(`✅ Loaded ${this.unreadCount} unread notifications`);

            return this.notifications;
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            return [];
        }
    }

    /**
     * Setup real-time listener for new notifications
     */
    setupRealtimeListener() {
        if (!this.db || !this.userId || !this.werkstatt) {
            console.error('❌ Cannot setup listener: missing data');
            return;
        }

        const collectionName = `mitarbeiterNotifications_${this.werkstatt}`;

        // Remove existing listener if any
        if (this.listener) {
            this.listener();
        }

        // Setup new listener
        this.listener = this.db
            .collection(collectionName)
            .where('mitarbeiterId', '==', this.userId)
            .where('status', '==', 'unread')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = {
                            id: change.doc.id,
                            ...change.doc.data(),
                        };

                        // Only show toast for NEW notifications (not initial load)
                        // ✅ FIX 2025-11-17: Type-safe ID comparison
                        if (!this.notifications.find(n => String(n.id) === String(notification.id))) {
                            console.log('🔔 New notification received:', notification.title);
                            this.showNotificationToast(notification);
                            this.speakNotification(notification);
                        }

                        // Add to notifications array
                        this.notifications.unshift(notification);
                        this.unreadCount++;
                    }

                    if (change.type === 'modified') {
                        // ✅ FIX 2025-11-17: Type-safe ID comparison
                        const index = this.notifications.findIndex(n => String(n.id) === String(change.doc.id));
                        if (index !== -1) {
                            this.notifications[index] = {
                                id: change.doc.id,
                                ...change.doc.data(),
                            };

                            // If status changed to 'read', remove from unread count
                            if (change.doc.data().status === 'read') {
                                this.notifications.splice(index, 1);
                                this.unreadCount--;
                            }
                        }
                    }
                });
            }, (error) => {
                console.error('❌ Notification listener error:', error);
            });

        console.log('✅ Real-time notification listener active');
    }

    /**
     * Show notification toast
     * @param {Object} notification - Notification object
     */
    showNotificationToast(notification) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.setAttribute('data-notification-id', notification.id);
        toast.setAttribute('data-priority', notification.priority || 'normal');

        // Priority icon
        const priorityIcons = {
            'urgent': '🚨',
            'high': '⚠️',
            'normal': '🔔',
            'low': 'ℹ️',
        };
        const icon = priorityIcons[notification.priority] || '🔔';

        // 🔧 FIX (2025-12-11): XSS Protection - escapeHtml für User-Daten
        toast.innerHTML = `
            <div class="notification-toast__icon">${icon}</div>
            <div class="notification-toast__content">
                <h4 class="notification-toast__title">${this.escapeHtml(notification.title)}</h4>
                <p class="notification-toast__message">${this.escapeHtml(notification.message)}</p>
                <span class="notification-toast__time">${this.getTimeAgo(notification.createdAt)}</span>
            </div>
            <button class="notification-toast__close" onclick="window.mitarbeiterNotifications.closeToast('${this.escapeHtml(notification.id)}')">×</button>
        `;

        // Add to DOM
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-hide after 10 seconds (urgent: 20s)
        const hideDelay = notification.priority === 'urgent' ? 20000 : 10000;
        setTimeout(() => this.closeToast(notification.id), hideDelay);

        // Click on toast: Mark as read and navigate if applicable
        // 🐛 BUG FIX (2026-01-09): Added async + await for markAsRead to ensure it completes
        toast.addEventListener('click', async (e) => {
            if (e.target.classList.contains('notification-toast__close')) return;

            await this.markAsRead(notification.id);
            this.closeToast(notification.id);

            // Navigate to relevant page
            this.navigateToNotification(notification);
        });
    }

    /**
     * Close toast notification
     * @param {string} notificationId - Notification ID
     */
    closeToast(notificationId) {
        const toast = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }

    /**
     * Speak notification using AI Agent TTS
     * @param {Object} notification - Notification object
     */
    async speakNotification(notification) {
        try {
            if (!window.aiAgent) {
                console.warn('⚠️ AI Agent not available, skipping speech');
                return;
            }

            // Only speak high/urgent priority notifications
            if (!['high', 'urgent'].includes(notification.priority)) {
                return;
            }

            const text = notification.sprachausgabe || notification.message;
            await window.aiAgent.speak(text);
        } catch (error) {
            console.error('❌ Error speaking notification:', error);
        }
    }

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     */
    async markAsRead(notificationId) {
        try {
            if (!this.db || !this.werkstatt) {
                console.error('❌ Cannot mark as read: missing data');
                return;
            }

            const collectionName = `mitarbeiterNotifications_${this.werkstatt}`;

            await this.db.collection(collectionName)
                .doc(notificationId)
                .update({
                    status: 'read',
                    readAt: firebase.firestore.Timestamp.now(),
                });

            console.log('✅ Notification marked as read:', notificationId);
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    /**
     * Navigate to notification's relevant page
     * @param {Object} notification - Notification object
     */
    navigateToNotification(notification) {
        const typeRoutes = {
            'neue_anfrage': `liste.html?fahrzeugId=${notification.fahrzeugId}`,
            'fahrzeug_bereit': `abnahme.html?fahrzeugId=${notification.fahrzeugId}`,
            'fahrzeug_fertig': `liste.html?fahrzeugId=${notification.fahrzeugId}`,
            'material_overdue': `material.html`,
        };

        const route = typeRoutes[notification.type];
        if (route) {
            console.log('🔗 Navigating to:', route);
            safeNavigate(route);
        }
    }

    /**
     * Get time ago string
     * @param {Timestamp} timestamp - Firestore timestamp
     * @returns {string} Time ago string (e.g., "vor 5 Minuten")
     */
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Gerade eben';

        const now = new Date();
        const time = timestamp.toDate();
        const diffMs = now - time;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Gerade eben';
        if (diffMin < 60) return `vor ${diffMin} Minute${diffMin > 1 ? 'n' : ''}`;
        if (diffHour < 24) return `vor ${diffHour} Stunde${diffHour > 1 ? 'n' : ''}`;
        if (diffDay < 7) return `vor ${diffDay} Tag${diffDay > 1 ? 'en' : ''}`;
        return time.toLocaleDateString('de-DE');
    }

    /**
     * Cleanup (remove listener)
     */
    cleanup() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

// Create global instance
window.mitarbeiterNotifications = new MitarbeiterNotificationManager();

console.log('✅ Mitarbeiter Notifications Manager loaded');
