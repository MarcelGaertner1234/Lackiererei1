/**
 * Toast Notification System
 * Modern, accessible notifications to replace alert() and confirm()
 *
 * Usage:
 * - toast.success('Fahrzeug gespeichert!')
 * - toast.error('Fehler beim Speichern')
 * - toast.warning('Bitte alle Felder ausfüllen')
 * - toast.info('Neue Nachricht verfügbar')
 * - toast.promise(promise, { loading: 'Speichert...', success: 'Gespeichert!', error: 'Fehler!' })
 *
 * Compatible with dark/light mode
 */

class ToastNotification {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.maxToasts = 3; // Maximum visible toasts
        this.defaultDuration = 3000; // 3 seconds
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Benachrichtigungen');
        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} options.duration - Display duration in ms (0 = no auto-dismiss)
     * @param {boolean} options.dismissible - Show close button
     * @param {Function} options.onClick - Click handler
     */
    show(message, options = {}) {
        const config = {
            type: options.type || 'info',
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            dismissible: options.dismissible !== undefined ? options.dismissible : true,
            onClick: options.onClick || null,
            icon: options.icon || this.getDefaultIcon(options.type || 'info')
        };

        // Create toast element
        const toast = this.createToast(message, config);

        // Add to DOM and array
        this.container.appendChild(toast);
        this.toasts.push({ element: toast, config });

        // Enforce max toasts limit
        if (this.toasts.length > this.maxToasts) {
            this.remove(this.toasts[0].element);
        }

        // Trigger animation
        setTimeout(() => toast.classList.add('toast--show'), 10);

        // Auto-dismiss
        if (config.duration > 0) {
            setTimeout(() => this.remove(toast), config.duration);
        }

        // Click handler
        if (config.onClick) {
            toast.addEventListener('click', config.onClick);
        }

        return toast;
    }

    createToast(message, config) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${config.type}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', config.type === 'error' ? 'assertive' : 'polite');

        const icon = document.createElement('span');
        icon.className = 'toast__icon';
        icon.textContent = config.icon;

        const messageEl = document.createElement('span');
        messageEl.className = 'toast__message';
        messageEl.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(messageEl);

        if (config.dismissible) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast__close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Benachrichtigung schließen');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(toast);
            });
            toast.appendChild(closeBtn);
        }

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;

        // Fade out animation
        toast.classList.remove('toast--show');
        toast.classList.add('toast--hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            // Remove from array
            this.toasts = this.toasts.filter(t => t.element !== toast);
        }, 300);
    }

    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error', duration: options.duration || 4000 });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }

    /**
     * Show a toast for a promise (loading → success/error)
     * @param {Promise} promise - The promise to track
     * @param {Object} messages - Messages for each state
     */
    async promise(promise, messages = {}) {
        const loading = messages.loading || 'Lädt...';
        const successMsg = messages.success || 'Erfolgreich!';
        const errorMsg = messages.error || 'Fehler!';

        // Show loading toast
        const loadingToast = this.show(loading, {
            type: 'info',
            duration: 0,
            dismissible: false,
            icon: '⏳'
        });

        try {
            const result = await promise;
            this.remove(loadingToast);
            this.success(successMsg);
            return result;
        } catch (error) {
            this.remove(loadingToast);
            this.error(errorMsg);
            throw error;
        }
    }

    /**
     * Confirm dialog replacement with toasts + buttons
     * @param {string} message - Confirmation message
     * @param {Object} options - Configuration
     * @returns {Promise<boolean>} - Resolves to true if confirmed
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const config = {
                type: 'warning',
                duration: 0, // Don't auto-dismiss
                dismissible: false,
                confirmText: options.confirmText || 'Bestätigen',
                cancelText: options.cancelText || 'Abbrechen'
            };

            const toast = document.createElement('div');
            toast.className = `toast toast--${config.type} toast--confirm`;
            toast.setAttribute('role', 'alertdialog');
            toast.setAttribute('aria-live', 'assertive');

            const icon = document.createElement('span');
            icon.className = 'toast__icon';
            icon.textContent = '❓';

            const messageEl = document.createElement('span');
            messageEl.className = 'toast__message';
            messageEl.textContent = message;

            const actions = document.createElement('div');
            actions.className = 'toast__actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'toast__btn toast__btn--cancel';
            cancelBtn.textContent = config.cancelText;
            cancelBtn.addEventListener('click', () => {
                this.remove(toast);
                resolve(false);
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'toast__btn toast__btn--confirm';
            confirmBtn.textContent = config.confirmText;
            confirmBtn.addEventListener('click', () => {
                this.remove(toast);
                resolve(true);
            });

            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);

            toast.appendChild(icon);
            toast.appendChild(messageEl);
            toast.appendChild(actions);

            this.container.appendChild(toast);
            this.toasts.push({ element: toast, config });

            // Trigger animation
            setTimeout(() => toast.classList.add('toast--show'), 10);
        });
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        this.toasts.forEach(({ element }) => this.remove(element));
    }
}

// Create global instance
const toast = new ToastNotification();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = toast;
}
