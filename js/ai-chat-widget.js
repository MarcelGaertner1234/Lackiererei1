/**
 * ============================================
 * AI CHAT WIDGET - UI Controller
 * ============================================
 *
 * Manages the chat widget UI
 * - Floating button
 * - Chat panel
 * - Message rendering
 * - Input handling
 * - Voice integration
 */

class AIChatWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.elements = {};

        this.init();
    }

    /**
     * Initialize chat widget
     */
    init() {
        // Create HTML structure
        this.createHTML();

        // Get element references
        this.elements = {
            button: document.getElementById('aiChatButton'),
            widget: document.getElementById('aiChatWidget'),
            close: document.getElementById('aiChatClose'),
            messages: document.getElementById('aiChatMessages'),
            input: document.getElementById('aiChatInput'),
            sendButton: document.getElementById('aiChatSend'),
            voiceButton: document.getElementById('aiChatVoice')
        };

        // Attach event listeners
        this.attachEvents();

        // Initialize AI Agent integration
        this.initAIAgent();

        console.log('✅ AI Chat Widget initialized');
    }

    /**
     * Create HTML structure
     */
    createHTML() {
        const html = `
            <!-- Floating Chat Button -->
            <button id="aiChatButton" class="ai-chat-button" title="KI-Assistent">
                🤖
            </button>

            <!-- Chat Widget -->
            <div id="aiChatWidget" class="ai-chat-widget">
                <!-- Header -->
                <div class="ai-chat-header">
                    <h3>🤖 KI-Assistent</h3>
                    <button id="aiChatClose" class="ai-chat-close">×</button>
                </div>

                <!-- Messages -->
                <div id="aiChatMessages" class="ai-chat-messages">
                    <!-- Messages will be added here -->
                </div>

                <!-- Input -->
                <div class="ai-chat-input-container">
                    <div class="ai-chat-input-wrapper">
                        <textarea
                            id="aiChatInput"
                            class="ai-chat-input"
                            placeholder="Schreibe eine Nachricht..."
                            rows="1"
                        ></textarea>
                        <button id="aiChatVoice" class="ai-chat-voice-button" title="Spracheingabe">
                            🎤
                        </button>
                        <button id="aiChatSend" class="ai-chat-send-button" title="Senden">
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to body
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
    }

    /**
     * Attach event listeners
     */
    attachEvents() {
        // Toggle widget
        this.elements.button.addEventListener('click', () => this.toggle());
        this.elements.close.addEventListener('click', () => this.close());

        // Send message
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());

        // Enter to send (Shift+Enter for new line)
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.input.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });

        // Voice button
        this.elements.voiceButton.addEventListener('click', () => this.toggleVoice());
    }

    /**
     * Initialize AI Agent integration
     */
    async initAIAgent() {
        try {
            // Wait for Firebase and AI Agent to be ready
            if (!window.aiAgent) {
                console.log('⏳ Waiting for AI Agent...');

                // Try to initialize if not done yet
                if (window.initAIAgent) {
                    await window.initAIAgent();
                } else {
                    throw new Error('AI Agent not loaded');
                }
            }

            // Setup callbacks
            if (window.aiAgent) {
                window.aiAgent.onMessageReceived = (data) => {
                    this.hideTypingIndicator();
                    this.addMessage(data.message, 'ai');
                };

                window.aiAgent.onMessageError = (error) => {
                    this.hideTypingIndicator();
                    this.addMessage(`Fehler: ${error.message}`, 'ai');
                };

                window.aiAgent.onListeningStart = () => {
                    this.elements.voiceButton.classList.add('recording');
                };

                window.aiAgent.onListeningEnd = () => {
                    this.elements.voiceButton.classList.remove('recording');
                };

                window.aiAgent.onVoiceInput = (transcript) => {
                    this.elements.input.value = transcript;
                };

                window.aiAgent.onListeningError = (error) => {
                    this.elements.voiceButton.classList.remove('recording');
                    this.addMessage(this.formatErrorMessage(error), 'ai');
                };

                console.log('✅ AI Agent integration ready');

                // Welcome message
                this.addMessage('Hallo! Ich bin dein KI-Assistent. Wie kann ich dir helfen?', 'ai');
            }
        } catch (error) {
            console.error('❌ AI Agent initialization failed:', error);
            this.addMessage('⚠️ KI-Agent konnte nicht initialisiert werden. Bitte Seite neu laden.', 'ai');
        }
    }

    /**
     * Toggle widget open/close
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open widget
     */
    open() {
        this.isOpen = true;
        this.elements.widget.classList.add('open');
        this.elements.input.focus();
        console.log('💬 Chat opened');
    }

    /**
     * Close widget
     */
    close() {
        this.isOpen = false;
        this.elements.widget.classList.remove('open');
        console.log('💬 Chat closed');
    }

    /**
     * Add message to chat
     */
    addMessage(text, sender = 'user') {
        const message = {
            text: text,
            sender: sender,
            timestamp: Date.now()
        };

        this.messages.push(message);

        // Create message HTML
        const messageEl = document.createElement('div');
        messageEl.className = `ai-chat-message ${sender}`;

        const avatar = sender === 'user' ? '👤' : '🤖';

        messageEl.innerHTML = `
            <div class="ai-chat-avatar">${avatar}</div>
            <div class="ai-chat-bubble">${this.escapeHtml(text)}</div>
        `;

        this.elements.messages.appendChild(messageEl);

        // Scroll to bottom
        this.scrollToBottom();

        // Pulse button if chat is closed and message is from AI
        if (!this.isOpen && sender === 'ai') {
            this.elements.button.classList.add('pulse');
            setTimeout(() => {
                this.elements.button.classList.remove('pulse');
            }, 3000);
        }
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'aiTypingIndicator';
        indicator.className = 'ai-chat-message ai';
        indicator.innerHTML = `
            <div class="ai-chat-avatar">🤖</div>
            <div class="ai-chat-bubble">
                <div class="ai-typing-indicator">
                    <div class="ai-typing-dot"></div>
                    <div class="ai-typing-dot"></div>
                    <div class="ai-typing-dot"></div>
                </div>
            </div>
        `;

        this.elements.messages.appendChild(indicator);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Send message
     */
    async sendMessage() {
        const text = this.elements.input.value.trim();

        if (!text) {
            return;
        }

        // Add user message
        this.addMessage(text, 'user');

        // Clear input
        this.elements.input.value = '';
        this.elements.input.style.height = 'auto';

        // Disable send button
        this.elements.sendButton.disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Check if AI Agent is ready
            if (!window.aiAgent || !window.aiAgent.isReady()) {
                throw new Error('AI Agent ist nicht bereit. Bitte warten...');
            }

            // Send to AI Agent (will trigger onMessageReceived callback)
            await window.aiAgent.sendMessage(text, {
                voiceOutput: false // Don't speak in widget (user can enable manually)
            });

        } catch (error) {
            console.error('❌ Send message failed:', error);
            this.hideTypingIndicator();
            this.addMessage(`Fehler: ${error.message}`, 'ai');
        } finally {
            // Re-enable send button
            this.elements.sendButton.disabled = false;
            this.elements.input.focus();
        }
    }

    /**
     * Toggle voice input
     */
    toggleVoice() {
        if (!window.aiAgent) {
            console.error('❌ AI Agent not available');
            this.addMessage('⚠️ KI-Agent wird noch geladen... Bitte warten Sie einen Moment.', 'ai');

            // Try to initialize AI Agent now
            if (window.initAIAgent) {
                window.initAIAgent().then(() => {
                    this.addMessage('✅ KI-Agent ist jetzt bereit! Bitte versuchen Sie es nochmal.', 'ai');
                }).catch(error => {
                    this.addMessage('❌ KI-Agent konnte nicht initialisiert werden: ' + error.message, 'ai');
                });
            }
            return;
        }

        if (!window.aiAgent.isVoiceInputSupported()) {
            this.addMessage('⚠️ Audioaufnahme wird in diesem Browser nicht unterstützt. Bitte verwenden Sie Chrome, Edge oder Safari.', 'ai');
            return;
        }

        if (window.aiAgent.isRecording) {
            window.aiAgent.stopRecording();
        } else {
            window.aiAgent.startRecording();
        }
    }

    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        setTimeout(() => {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }, 100);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format error messages for display
     */
    formatErrorMessage(errorCode) {
        const messages = {
            'netzwerk_fehler': '🌐 Netzwerkfehler: Die Spracherkennung konnte sich nicht mit dem Server verbinden. Bitte überprüfe deine Internetverbindung oder tippe deine Nachricht ein.',
            'keine_sprache': '🔇 Keine Sprache erkannt. Bitte sprich deutlicher und versuche es nochmal.',
            'kein_mikrofon': '🎤 Kein Mikrofon gefunden. Bitte stelle sicher, dass ein Mikrofon angeschlossen ist.',
            'berechtigung_verweigert': '🔐 Mikrofon-Berechtigung verweigert. Klicke auf das Mikrofon-Icon in der Adressleiste und erteile Zugriff.',
            'aborted': '⏸️ Spracherkennung abgebrochen.',
            'service-not-allowed': '🚫 Spracherkennung nicht verfügbar. Bitte verwende einen unterstützten Browser (Chrome, Edge, Safari).',
            'aufnahme_fehler': '🎙️ Fehler bei der Audioaufnahme. Bitte überprüfe dein Mikrofon und versuche es nochmal.',
            'audio_zu_gross': '📦 Audio zu groß (>25 MB). Bitte sprich kürzer (max. 1-2 Minuten).',
            'verarbeitung_fehler': '⚙️ Fehler bei der Audio-Verarbeitung. Bitte versuche es nochmal.',
            'transkription_fehler': '🤖 Fehler bei der Transkription. Bitte überprüfe deine Internetverbindung oder tippe deine Nachricht ein.'
        };

        return messages[errorCode] || `❌ Spracherkennung fehlgeschlagen: ${errorCode}. Bitte tippe deine Nachricht ein.`;
    }

    /**
     * Clear chat history
     */
    clearChat() {
        this.messages = [];
        this.elements.messages.innerHTML = '';

        if (window.aiAgent) {
            window.aiAgent.clearHistory();
        }

        console.log('🗑️ Chat cleared');
    }
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}

function initChatWidget() {
    // Wait for AI Agent to be ready (polling mechanism)
    const checkAIAgent = setInterval(() => {
        if (window.aiAgent && typeof window.aiAgent.isReady === 'function' && window.aiAgent.isReady()) {
            clearInterval(checkAIAgent);
            window.aiChatWidget = new AIChatWidget();
            console.log('✅ Chat Widget ready (window.aiChatWidget)');
        }
    }, 200); // Check every 200ms

    // Timeout after 10 seconds (fallback)
    setTimeout(() => {
        clearInterval(checkAIAgent);
        if (!window.aiChatWidget) {
            console.warn('⚠️ AI Agent not ready after 10s, starting widget anyway');
            window.aiChatWidget = new AIChatWidget();
        }
    }, 10000);
}
