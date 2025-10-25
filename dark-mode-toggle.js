/**
 * 🌓 DARK MODE TOGGLE SYSTEM
 *
 * Auto-Detection + Manual Toggle für Light/Dark Mode
 * - Erkennt System-Präferenz (prefers-color-scheme)
 * - Speichert User-Präferenz in LocalStorage
 * - Smooth Transition zwischen Modes
 * - Event-System für andere Komponenten
 *
 * Dependencies: design-system.css
 *
 * Version: 1.0
 * Created: 22.10.2025
 * Author: Claude Code CEO Agent
 */

class DarkModeToggle {
  constructor() {
    this.theme = null;
    this.toggleButton = null;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.init();
  }

  /**
   * Initialize Dark Mode System
   */
  init() {
    // Load saved theme from LocalStorage
    this.loadSavedTheme();

    // Listen to system preference changes
    this.mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        // Only auto-switch if user hasn't set manual preference
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    // Create toggle button
    this.createToggleButton();

    // Dispatch theme loaded event
    this.dispatchThemeEvent('themeLoaded');

    console.log('🌓 Dark Mode Toggle System initialized');
    console.log('  Current theme:', this.theme);
    console.log('  System preference:', this.mediaQuery.matches ? 'dark' : 'light');
  }

  /**
   * Load saved theme from LocalStorage
   */
  loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
      // Use saved theme
      this.setTheme(savedTheme, false);
    } else {
      // Use system preference
      const systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
      this.setTheme(systemTheme, false);
    }
  }

  /**
   * Set theme (light or dark)
   * @param {string} theme - 'light' or 'dark'
   * @param {boolean} saveToLocalStorage - whether to save to LocalStorage
   */
  setTheme(theme, saveToLocalStorage = true) {
    // Validate theme
    if (theme !== 'light' && theme !== 'dark') {
      console.error('Invalid theme:', theme);
      return;
    }

    // Update theme
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Save to LocalStorage if requested
    if (saveToLocalStorage) {
      localStorage.setItem('theme', theme);
    }

    // Update toggle button
    this.updateToggleButton();

    // Dispatch theme change event
    this.dispatchThemeEvent('themeChanged', { theme });

    console.log('🌓 Theme changed:', theme);
  }

  /**
   * Toggle between light and dark mode
   */
  toggle() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme, true);
  }

  /**
   * Get current theme
   * @returns {string} 'light' or 'dark'
   */
  getTheme() {
    return this.theme;
  }

  /**
   * Check if dark mode is active
   * @returns {boolean}
   */
  isDarkMode() {
    return this.theme === 'dark';
  }

  /**
   * Create toggle button in DOM
   */
  createToggleButton() {
    // Check if button already exists
    if (document.getElementById('dark-mode-toggle')) {
      this.toggleButton = document.getElementById('dark-mode-toggle');
      this.updateToggleButton();
      this.attachToggleListener();
      return;
    }

    // Create button element
    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.className = 'dark-mode-toggle glass-button glass-button--icon';
    button.setAttribute('aria-label', 'Toggle Dark Mode');
    button.innerHTML = `
      <span class="dark-mode-toggle__icon dark-mode-toggle__icon--sun">☀️</span>
      <span class="dark-mode-toggle__icon dark-mode-toggle__icon--moon">🌙</span>
    `;

    // Add CSS for toggle button
    this.injectToggleStyles();

    // Append to body
    document.body.appendChild(button);
    this.toggleButton = button;

    // Attach click listener
    this.attachToggleListener();

    // Update button state
    this.updateToggleButton();
  }

  /**
   * Attach click listener to toggle button
   */
  attachToggleListener() {
    if (!this.toggleButton) return;

    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });
  }

  /**
   * Update toggle button appearance
   */
  updateToggleButton() {
    if (!this.toggleButton) return;

    const sunIcon = this.toggleButton.querySelector('.dark-mode-toggle__icon--sun');
    const moonIcon = this.toggleButton.querySelector('.dark-mode-toggle__icon--moon');

    if (this.theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  /**
   * Inject toggle button styles
   */
  injectToggleStyles() {
    // Check if styles already injected
    if (document.getElementById('dark-mode-toggle-styles')) return;

    const style = document.createElement('style');
    style.id = 'dark-mode-toggle-styles';
    style.textContent = `
      .dark-mode-toggle {
        position: fixed;
        top: var(--space-4);
        right: var(--space-4);
        z-index: var(--z-fixed);
        width: 48px;
        height: 48px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        transition: all var(--duration-base) var(--ease-out);
      }

      .dark-mode-toggle:hover {
        transform: translateY(-2px) rotate(15deg);
        box-shadow: var(--shadow-lg);
      }

      .dark-mode-toggle:active {
        transform: translateY(0) rotate(0deg) scale(0.95);
      }

      .dark-mode-toggle__icon {
        transition: all var(--duration-base) var(--ease-out);
      }

      @media (max-width: 768px) {
        .dark-mode-toggle {
          top: auto;
          bottom: calc(80px + var(--space-4));
          width: 44px;
          height: 44px;
          font-size: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Dispatch custom theme event
   * @param {string} eventName - Event name
   * @param {object} detail - Event details
   */
  dispatchThemeEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail: {
        ...detail,
        theme: this.theme
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Remove toggle button
   */
  destroy() {
    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }

    const styles = document.getElementById('dark-mode-toggle-styles');
    if (styles) {
      styles.remove();
    }

    console.log('🌓 Dark Mode Toggle System destroyed');
  }
}

// Initialize Dark Mode Toggle on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.darkModeToggle = new DarkModeToggle();
  });
} else {
  window.darkModeToggle = new DarkModeToggle();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DarkModeToggle;
}

/**
 * USAGE EXAMPLES
 *
 * 1. Listen to theme changes:
 *
 * window.addEventListener('themeChanged', (event) => {
 *   console.log('Theme changed to:', event.detail.theme);
 *   // Update your components...
 * });
 *
 * 2. Manually toggle theme:
 *
 * window.darkModeToggle.toggle();
 *
 * 3. Check current theme:
 *
 * if (window.darkModeToggle.isDarkMode()) {
 *   console.log('Dark mode is active!');
 * }
 *
 * 4. Set specific theme:
 *
 * window.darkModeToggle.setTheme('dark');
 *
 * 5. Get current theme:
 *
 * const currentTheme = window.darkModeToggle.getTheme();
 */
