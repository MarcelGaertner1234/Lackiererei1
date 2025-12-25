/**
 * ✅ BUG #2 FIX: OpenAI API Quota Display & Warnings
 *
 * Purpose: Frontend widget for displaying remaining OpenAI API quota
 * Risk Level: LOW (read-only, no API calls unless user opens widget)
 *
 * Features:
 * - Real-time quota display for all 4 API types
 * - Color-coded warnings (green → yellow → red)
 * - Proactive notifications at 80%, 90%, 100%
 * - Minimalist floating widget (non-intrusive)
 * - Auto-refresh every 5 minutes
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

window.quotaDisplayState = {
  isVisible: false,
  lastFetch: null,
  autoRefreshInterval: null,
  notificationsSent: {
    aiChat: {},
    whisper: {},
    tts: {},
    pdfVision: {}
  }
};

// 🚀 PERF: Page Visibility API - Skip API calls when tab is hidden
let isPageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (window.DEBUG) console.log(`🚀 [quota-display] Page visibility: ${isPageVisible ? 'visible' : 'hidden'}`);
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize quota display widget
 * Call this AFTER Firebase Auth is initialized
 */
async function initQuotaDisplay() {
  if (window.DEBUG) console.log('🔵 [quota-display] Initializing...');

  // Wait for Firebase Auth
  await window.firebaseInitialized;

  // Check if user is authenticated
  const user = firebase.auth().currentUser;
  if (!user) {
    if (window.DEBUG) console.log('⚠️ [quota-display] User not authenticated, skipping');
    return;
  }

  // Create widget HTML
  createQuotaWidget();

  // Fetch initial quota
  await fetchAndUpdateQuota();

  // Auto-refresh every 5 minutes
  window.quotaDisplayState.autoRefreshInterval = setInterval(async () => {
    await fetchAndUpdateQuota();
  }, 5 * 60 * 1000);

  // 🔧 FIX (2025-12-11): Memory Leak Prevention - Cleanup bei Page Leave
  window.addEventListener('beforeunload', () => {
    if (window.quotaDisplayState.autoRefreshInterval) {
      clearInterval(window.quotaDisplayState.autoRefreshInterval);
      window.quotaDisplayState.autoRefreshInterval = null;
    }
  });

  if (window.DEBUG) console.log('✅ [quota-display] Initialized successfully');
}

// ============================================================================
// UI CREATION
// ============================================================================

/**
 * Create floating widget HTML
 */
function createQuotaWidget() {
  const widgetHTML = `
    <div id="quota-display-widget" class="quota-widget">
      <!-- Floating Button (always visible) -->
      <button id="quota-toggle-btn" class="quota-toggle-btn" title="API Quota anzeigen">
        <span class="quota-icon">📊</span>
        <span id="quota-summary" class="quota-summary"></span>
      </button>

      <!-- Expandable Panel (hidden by default) -->
      <div id="quota-panel" class="quota-panel" style="display: none;">
        <div class="quota-header">
          <h3>OpenAI API Quota</h3>
          <button id="quota-close-btn" class="quota-close-btn">✕</button>
        </div>

        <div class="quota-content">
          <!-- AI Chat -->
          <div class="quota-item">
            <div class="quota-label">
              <span class="quota-icon-small">💬</span>
              <span>AI Chat (GPT-4)</span>
            </div>
            <div class="quota-bar-container">
              <div id="quota-bar-aiChat" class="quota-bar"></div>
            </div>
            <div id="quota-text-aiChat" class="quota-text"></div>
          </div>

          <!-- Whisper (Speech-to-Text) -->
          <div class="quota-item">
            <div class="quota-label">
              <span class="quota-icon-small">🎤</span>
              <span>Spracherkennung</span>
            </div>
            <div class="quota-bar-container">
              <div id="quota-bar-whisper" class="quota-bar"></div>
            </div>
            <div id="quota-text-whisper" class="quota-text"></div>
          </div>

          <!-- TTS (Text-to-Speech) -->
          <div class="quota-item">
            <div class="quota-label">
              <span class="quota-icon-small">🔊</span>
              <span>Text-to-Speech</span>
            </div>
            <div class="quota-bar-container">
              <div id="quota-bar-tts" class="quota-bar"></div>
            </div>
            <div id="quota-text-tts" class="quota-text"></div>
          </div>

          <!-- PDF Vision -->
          <div class="quota-item">
            <div class="quota-label">
              <span class="quota-icon-small">📄</span>
              <span>PDF-Analyse</span>
            </div>
            <div class="quota-bar-container">
              <div id="quota-bar-pdfVision" class="quota-bar"></div>
            </div>
            <div id="quota-text-pdfVision" class="quota-text"></div>
          </div>
        </div>

        <div class="quota-footer">
          <small id="quota-reset-time">Reset: ...</small>
        </div>
      </div>
    </div>
  `;

  // Inject into DOM
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // Add event listeners
  document.getElementById('quota-toggle-btn').addEventListener('click', toggleQuotaPanel);
  document.getElementById('quota-close-btn').addEventListener('click', toggleQuotaPanel);

  if (window.DEBUG) console.log('✅ [quota-display] Widget HTML created');
}

/**
 * Toggle quota panel visibility
 */
function toggleQuotaPanel() {
  const panel = document.getElementById('quota-panel');
  const isVisible = panel.style.display !== 'none';

  if (isVisible) {
    panel.style.display = 'none';
    window.quotaDisplayState.isVisible = false;
  } else {
    panel.style.display = 'block';
    window.quotaDisplayState.isVisible = true;
    // Fetch fresh data when opening
    fetchAndUpdateQuota();
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch quota from Cloud Function and update UI
 */
async function fetchAndUpdateQuota() {
  // 🚀 PERF: Skip API calls when tab is hidden (saves bandwidth)
  if (!isPageVisible) {
    if (window.DEBUG) console.log('📊 [quota-display] Skipping fetch - tab hidden');
    return;
  }

  try {
    if (window.DEBUG) console.log('📊 [quota-display] Fetching quota...');

    // Get werkstattId from global
    const werkstattId = window.werkstattId || 'mosbach';

    // Call Cloud Function
    const getQuota = firebase.functions().httpsCallable('getQuota');
    const result = await getQuota({ werkstatt: werkstattId });

    if (!result.data.success) {
      throw new Error('Quota fetch returned success: false');
    }

    const quota = result.data;

    if (window.DEBUG) console.log('✅ [quota-display] Quota fetched:', quota);

    // Update UI
    updateQuotaUI(quota);

    // Check for warnings
    checkQuotaWarnings(quota);

    // Update timestamp
    window.quotaDisplayState.lastFetch = new Date();

  } catch (error) {
    console.error('❌ [quota-display] Fetch failed:', error);

    // Show error in UI
    const summaryEl = document.getElementById('quota-summary');
    if (summaryEl) {
      summaryEl.textContent = '⚠️';
      summaryEl.style.color = '#ff6b6b';
    }
  }
}

/**
 * Update UI with fetched quota data
 */
function updateQuotaUI(quota) {
  // Update each API type
  updateQuotaItem('aiChat', quota.aiChat);
  updateQuotaItem('whisper', quota.whisper);
  updateQuotaItem('tts', quota.tts);
  updateQuotaItem('pdfVision', quota.pdfVision);

  // Update reset time
  const resetTimeEl = document.getElementById('quota-reset-time');
  if (resetTimeEl && quota.resetAt) {
    const resetDate = new Date(quota.resetAt);
    const resetTimeStr = resetDate.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    });
    resetTimeEl.textContent = `Reset: ${resetTimeStr} Uhr`;
  }

  // Update floating button summary (show worst quota)
  updateFloatingButtonSummary(quota);
}

/**
 * Update single quota item (bar + text)
 */
function updateQuotaItem(type, data) {
  const { used, limit, remaining } = data;
  const percentage = (used / limit) * 100;

  // Update progress bar
  const barEl = document.getElementById(`quota-bar-${type}`);
  if (barEl) {
    barEl.style.width = `${percentage}%`;

    // Color-code based on usage
    if (percentage >= 90) {
      barEl.style.backgroundColor = '#ff6b6b'; // Red
    } else if (percentage >= 80) {
      barEl.style.backgroundColor = '#feca57'; // Yellow
    } else {
      barEl.style.backgroundColor = '#48dbfb'; // Blue
    }
  }

  // Update text
  const textEl = document.getElementById(`quota-text-${type}`);
  if (textEl) {
    textEl.textContent = `${used} / ${limit} (${remaining} übrig)`;
  }
}

/**
 * Update floating button with worst quota status
 */
function updateFloatingButtonSummary(quota) {
  const summaryEl = document.getElementById('quota-summary');
  if (!summaryEl) return;

  // Find worst quota (highest percentage used)
  let worstPercentage = 0;
  let worstType = null;

  for (const [type, data] of Object.entries(quota)) {
    if (type === 'resetAt') continue;

    const percentage = (data.used / data.limit) * 100;
    if (percentage > worstPercentage) {
      worstPercentage = percentage;
      worstType = type;
    }
  }

  // Update summary text
  if (worstPercentage >= 90) {
    summaryEl.textContent = '⚠️';
    summaryEl.style.color = '#ff6b6b';
  } else if (worstPercentage >= 80) {
    summaryEl.textContent = '⚡';
    summaryEl.style.color = '#feca57';
  } else {
    summaryEl.textContent = '✓';
    summaryEl.style.color = '#48dbfb';
  }
}

// ============================================================================
// WARNING SYSTEM
// ============================================================================

/**
 * Check quota levels and send warnings if needed
 */
function checkQuotaWarnings(quota) {
  checkSingleQuotaWarning('aiChat', quota.aiChat, 'AI Chat');
  checkSingleQuotaWarning('whisper', quota.whisper, 'Spracherkennung');
  checkSingleQuotaWarning('tts', quota.tts, 'Text-to-Speech');
  checkSingleQuotaWarning('pdfVision', quota.pdfVision, 'PDF-Analyse');
}

/**
 * Check single quota and send warning if threshold crossed
 */
function checkSingleQuotaWarning(type, data, label) {
  const { used, limit, remaining } = data;
  const percentage = (used / limit) * 100;

  const notificationState = window.quotaDisplayState.notificationsSent[type];

  // 100% - Limit erreicht
  if (percentage >= 100 && !notificationState['100']) {
    showQuotaWarning(label, 100, remaining);
    notificationState['100'] = true;
  }
  // 90% - Kritisch
  else if (percentage >= 90 && !notificationState['90']) {
    showQuotaWarning(label, 90, remaining);
    notificationState['90'] = true;
  }
  // 80% - Warnung
  else if (percentage >= 80 && !notificationState['80']) {
    showQuotaWarning(label, 80, remaining);
    notificationState['80'] = true;
  }
}

/**
 * Show quota warning toast
 */
function showQuotaWarning(label, percentage, remaining) {
  let message;
  let type;

  if (percentage >= 100) {
    message = `${label}: Tageslimit erreicht! Morgen wieder verfügbar.`;
    type = 'error';
  } else if (percentage >= 90) {
    message = `${label}: Nur noch ${remaining} Anfragen übrig (Kritisch!)`;
    type = 'error';
  } else if (percentage >= 80) {
    message = `${label}: Nur noch ${remaining} Anfragen übrig`;
    type = 'warning';
  }

  console.warn(`⚠️ [quota-display] ${message}`);

  // Show toast notification
  if (typeof window.toast !== 'undefined') {
    window.toast[type](message);
  } else if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    // Fallback to alert
    if (percentage >= 100) {
      alert(message);
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Manually refresh quota (called by other scripts)
 */
window.refreshQuota = async function() {
  await fetchAndUpdateQuota();
};

/**
 * Get current quota for specific API type (cached)
 * Returns null if not fetched yet
 */
window.getQuotaRemaining = function(type) {
  const textEl = document.getElementById(`quota-text-${type}`);
  if (!textEl) return null;

  const match = textEl.textContent.match(/\((\d+) übrig\)/);
  return match ? parseInt(match[1]) : null;
};

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', () => {
  // Clear auto-refresh interval
  if (window.quotaDisplayState.autoRefreshInterval) {
    clearInterval(window.quotaDisplayState.autoRefreshInterval);
  }
});

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

// Auto-initialize when DOM is ready (only on pages that need it)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if page should have quota display
    const shouldInit = document.body.classList.contains('has-ai-features');
    if (shouldInit) {
      initQuotaDisplay();
    }
  });
} else {
  // DOM already loaded
  const shouldInit = document.body.classList.contains('has-ai-features');
  if (shouldInit) {
    initQuotaDisplay();
  }
}

if (window.DEBUG) console.log('✅ [quota-display] Script loaded');
