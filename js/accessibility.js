/**
 * ============================================
 * ACCESSIBILITY MODULE - Session #12 (2026-01-12)
 * ============================================
 * Zentrales Modul für Accessibility-Verbesserungen
 * - Skip-Links für Keyboard Navigation
 * - Focus Management für Modals
 * - ARIA-Attribute für dynamische Inhalte
 * - Screen Reader Announcements
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // SKIP LINKS
    // ============================================

    /**
     * Fügt Skip-Links am Anfang der Seite hinzu
     */
    function initSkipLinks() {
        // Prüfe ob Skip-Links bereits existieren
        if (document.getElementById('skip-links')) return;

        const skipLinksContainer = document.createElement('div');
        skipLinksContainer.id = 'skip-links';
        skipLinksContainer.className = 'skip-links';
        skipLinksContainer.innerHTML = `
            <a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>
            <a href="#main-nav" class="skip-link">Zur Navigation springen</a>
        `;

        // Am Anfang des Body einfügen
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);

        // Styles für Skip-Links hinzufügen (falls nicht im CSS)
        if (!document.getElementById('skip-links-styles')) {
            const styles = document.createElement('style');
            styles.id = 'skip-links-styles';
            styles.textContent = `
                .skip-links {
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 100000;
                }
                .skip-link {
                    position: absolute;
                    left: -9999px;
                    top: auto;
                    width: 1px;
                    height: 1px;
                    overflow: hidden;
                    z-index: 100000;
                    padding: 12px 24px;
                    background: var(--color-primary, #007aff);
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                .skip-link:focus {
                    position: fixed;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 0;
                    width: auto;
                    height: auto;
                    outline: 3px solid var(--color-primary, #007aff);
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(styles);
        }

        // Main Content ID setzen falls nicht vorhanden
        const mainContent = document.querySelector('main, .container, .hero, [role="main"]');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }

        // Navigation ID setzen falls nicht vorhanden
        const mainNav = document.querySelector('nav, .bottom-nav, [role="navigation"]');
        if (mainNav && !mainNav.id) {
            mainNav.id = 'main-nav';
        }
    }

    // ============================================
    // MODAL FOCUS MANAGEMENT
    // ============================================

    let lastFocusedElement = null;
    let focusTrapHandler = null;

    /**
     * Fokus in einem Modal einfangen (Focus Trap)
     * @param {HTMLElement} modal - Das Modal-Element
     */
    function trapFocus(modal) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        const focusableElements = modal.querySelectorAll(focusableSelectors);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Speichere das zuletzt fokussierte Element
        lastFocusedElement = document.activeElement;

        // Fokus auf erstes Element setzen
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 50);
        }

        // Focus Trap Handler
        focusTrapHandler = function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab: Wenn auf erstem Element, springe zum letzten
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable?.focus();
                    }
                } else {
                    // Tab: Wenn auf letztem Element, springe zum ersten
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable?.focus();
                    }
                }
            }
            // Escape schließt das Modal
            if (e.key === 'Escape') {
                const closeBtn = modal.querySelector('[onclick*="close"], .close-btn, .btn-close, [data-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                }
            }
        };

        modal.addEventListener('keydown', focusTrapHandler);
    }

    /**
     * Focus Trap entfernen und Fokus zurücksetzen
     * @param {HTMLElement} modal - Das Modal-Element
     */
    function releaseFocus(modal) {
        if (focusTrapHandler) {
            modal.removeEventListener('keydown', focusTrapHandler);
            focusTrapHandler = null;
        }
        // Fokus zurück zum auslösenden Element
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }

    /**
     * Modal für Accessibility vorbereiten
     * @param {HTMLElement} modal - Das Modal-Element
     */
    function enhanceModal(modal) {
        // Bereits verbessert?
        if (modal.dataset.a11yEnhanced) return;

        // ARIA-Attribute hinzufügen falls nicht vorhanden
        if (!modal.hasAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        if (!modal.hasAttribute('aria-modal')) {
            modal.setAttribute('aria-modal', 'true');
        }

        // Titel für aria-labelledby finden
        const title = modal.querySelector('h1, h2, h3, h4, .modal-title, .modal__title');
        if (title && !modal.hasAttribute('aria-labelledby')) {
            if (!title.id) {
                title.id = 'modal-title-' + Math.random().toString(36).substring(2, 9);
            }
            modal.setAttribute('aria-labelledby', title.id);
        }

        modal.dataset.a11yEnhanced = 'true';
    }

    /**
     * MutationObserver für dynamisch hinzugefügte Modals
     */
    function observeModals() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Neues Modal hinzugefügt
                        if (node.classList?.contains('modal') ||
                            node.classList?.contains('admin-modal') ||
                            node.id?.includes('Modal')) {
                            enhanceModal(node);
                        }
                        // Modal innerhalb des neuen Knotens
                        node.querySelectorAll?.('.modal, .admin-modal, [id*="Modal"]').forEach(enhanceModal);
                    }
                });

                // Prüfe ob ein Modal sichtbar wurde
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    const target = mutation.target;
                    if (target.classList?.contains('active') ||
                        target.classList?.contains('show') ||
                        target.classList?.contains('visible') ||
                        target.style?.display === 'flex' ||
                        target.style?.display === 'block') {
                        if (target.getAttribute('role') === 'dialog') {
                            trapFocus(target);
                        }
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    // ============================================
    // LIVE REGIONS FÜR ANNOUNCEMENTS
    // ============================================

    let liveRegion = null;

    /**
     * Initialisiert eine Live Region für Screen Reader Announcements
     */
    function initLiveRegion() {
        if (document.getElementById('a11y-live-region')) return;

        liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-live-region';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(liveRegion);
    }

    /**
     * Kündigt eine Nachricht für Screen Reader an
     * @param {string} message - Die anzukündigende Nachricht
     * @param {string} priority - 'polite' oder 'assertive'
     */
    function announce(message, priority = 'polite') {
        if (!liveRegion) initLiveRegion();

        liveRegion.setAttribute('aria-live', priority);
        // Clear and set to trigger announcement
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    // ============================================
    // ICON BUTTONS ENHANCEMENT
    // ============================================

    /**
     * Verbessert Icon-only Buttons mit aria-labels
     */
    function enhanceIconButtons() {
        // Buttons mit nur Icons (keine Textinhalte)
        document.querySelectorAll('button, .btn, [role="button"]').forEach(btn => {
            // Prüfe ob Button nur Icon enthält
            const text = btn.textContent?.trim();
            const hasIcon = btn.querySelector('i, svg, [data-feather]');

            if (hasIcon && !text && !btn.hasAttribute('aria-label')) {
                // Versuche Label aus Icon-Klasse oder data-feather abzuleiten
                const icon = btn.querySelector('[data-feather]');
                if (icon) {
                    const featherName = icon.getAttribute('data-feather');
                    const labelMap = {
                        'plus': 'Hinzufügen',
                        'x': 'Schließen',
                        'close': 'Schließen',
                        'check': 'Bestätigen',
                        'edit': 'Bearbeiten',
                        'edit-2': 'Bearbeiten',
                        'trash': 'Löschen',
                        'trash-2': 'Löschen',
                        'search': 'Suchen',
                        'settings': 'Einstellungen',
                        'menu': 'Menü öffnen',
                        'more-vertical': 'Mehr Optionen',
                        'more-horizontal': 'Mehr Optionen',
                        'refresh-cw': 'Aktualisieren',
                        'download': 'Herunterladen',
                        'upload': 'Hochladen',
                        'save': 'Speichern',
                        'copy': 'Kopieren',
                        'share': 'Teilen',
                        'eye': 'Anzeigen',
                        'eye-off': 'Verbergen',
                        'filter': 'Filtern',
                        'sort': 'Sortieren',
                        'arrow-left': 'Zurück',
                        'arrow-right': 'Weiter',
                        'chevron-left': 'Zurück',
                        'chevron-right': 'Weiter',
                        'chevron-up': 'Nach oben',
                        'chevron-down': 'Nach unten',
                        'maximize': 'Maximieren',
                        'minimize': 'Minimieren',
                        'info': 'Information',
                        'help-circle': 'Hilfe',
                        'alert-circle': 'Warnung',
                        'print': 'Drucken',
                        'mail': 'E-Mail senden',
                        'phone': 'Anrufen',
                        'calendar': 'Kalender',
                        'clock': 'Uhrzeit',
                        'user': 'Benutzer',
                        'users': 'Benutzer',
                        'log-out': 'Abmelden',
                        'log-in': 'Anmelden'
                    };
                    if (labelMap[featherName]) {
                        btn.setAttribute('aria-label', labelMap[featherName]);
                    }
                }

                // Icons auf aria-hidden setzen
                btn.querySelectorAll('i, svg, [data-feather]').forEach(icon => {
                    icon.setAttribute('aria-hidden', 'true');
                });
            }
        });
    }

    // ============================================
    // FORM ENHANCEMENTS
    // ============================================

    /**
     * Verbessert Formulare für Accessibility
     */
    function enhanceForms() {
        // Inputs ohne Labels
        document.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'hidden') return;

            const id = input.id;
            if (!id) return;

            // Prüfe ob Label existiert
            const hasLabel = document.querySelector(`label[for="${id}"]`);
            const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');

            if (!hasLabel && !hasAriaLabel) {
                // Versuche Label aus Placeholder abzuleiten
                const placeholder = input.placeholder;
                if (placeholder) {
                    input.setAttribute('aria-label', placeholder);
                }
            }

            // Required-Felder markieren
            if (input.required && !input.hasAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }
        });

        // Error Messages mit aria-describedby verknüpfen
        document.querySelectorAll('.error-message, .form-error, [class*="error"]').forEach(error => {
            if (!error.id) {
                error.id = 'error-' + Math.random().toString(36).substring(2, 9);
            }
            error.setAttribute('role', 'alert');
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Skip-Links hinzufügen
        initSkipLinks();

        // Live Region initialisieren
        initLiveRegion();

        // Bestehende Modals verbessern
        document.querySelectorAll('.modal, .admin-modal, [id*="Modal"]').forEach(enhanceModal);

        // Icon Buttons verbessern
        enhanceIconButtons();

        // Formulare verbessern
        enhanceForms();

        // Observer für dynamische Inhalte
        observeModals();

        // console.log('✅ Accessibility module initialized');
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.a11y = {
        announce: announce,
        trapFocus: trapFocus,
        releaseFocus: releaseFocus,
        enhanceModal: enhanceModal,
        enhanceIconButtons: enhanceIconButtons,
        enhanceForms: enhanceForms
    };

})();
