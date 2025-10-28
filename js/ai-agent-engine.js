/**
 * ============================================
 * AI AGENT ENGINE - Frontend Integration
 * ============================================
 *
 * Manages AI Agent interactions on the frontend:
 * - Calls Firebase Cloud Function aiAgentExecute
 * - Handles conversation history
 * - Voice input (Web Speech API)
 * - Voice output (Speech Synthesis API)
 * - UI integration
 *
 * Architecture: Client → Cloud Function → OpenAI GPT-4 → Tools
 * Language: German
 */

class AIAgentEngine {
    constructor() {
        this.conversationHistory = [];
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.werkstatt = this.detectWerkstatt();
        this.userId = this.getUserId();
        this.callableFunction = null;

        console.log('🤖 AI Agent Engine initialized');
        console.log(`Werkstatt: ${this.werkstatt}, User: ${this.userId || 'anonym'}`);
    }

    /**
     * Initialize Firebase Functions callable reference
     */
    async initialize() {
        try {
            // Wait for Firebase to be initialized
            if (!window.firebase || !window.firebase.functions) {
                throw new Error('Firebase Functions not loaded');
            }

            // Get callable function reference (europe-west3 for DSGVO compliance)
            this.callableFunction = firebase.functions('europe-west3').httpsCallable('aiAgentExecute');
            console.log('✅ AI Agent callable function ready (europe-west3)');

            // Initialize Speech Recognition (if available)
            this.initializeSpeechRecognition();

            return true;
        } catch (error) {
            console.error('❌ AI Agent initialization failed:', error);
            return false;
        }
    }

    /**
     * Detect werkstatt from collection or default to mosbach
     */
    detectWerkstatt() {
        // Try to get from auth manager if available
        if (window.authManager && window.authManager.werkstatt) {
            return window.authManager.werkstatt;
        }

        // Try to extract from collection name
        const collectionNames = ['fahrzeuge', 'kunden', 'kalender'];
        for (const baseName of collectionNames) {
            try {
                const collection = window.getCollection(baseName);
                if (collection && collection._query && collection._query.path) {
                    const path = collection._query.path.segments[0];
                    const match = path.match(/_(mosbach|heidelberg|other)$/);
                    if (match) {
                        return match[1];
                    }
                }
            } catch (error) {
                // Continue trying
            }
        }

        // Default to mosbach
        return 'mosbach';
    }

    /**
     * Get current user ID from Firebase Auth
     */
    getUserId() {
        try {
            if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
                return window.firebase.auth().currentUser.uid;
            }
        } catch (error) {
            console.warn('⚠️ Could not get user ID:', error);
        }
        return null;
    }

    /**
     * Initialize Web Speech API for voice input
     */
    initializeSpeechRecognition() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.warn('⚠️ Speech Recognition not supported in this browser');
                return;
            }

            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'de-DE';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('🎤 Listening...');
                this.onListeningStart && this.onListeningStart();
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('🎤 Heard:', transcript);
                this.onVoiceInput && this.onVoiceInput(transcript);

                // Automatically send the message
                this.sendMessage(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                this.isListening = false;
                this.onListeningError && this.onListeningError(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                console.log('🎤 Stopped listening');
                this.onListeningEnd && this.onListeningEnd();
            };

            console.log('✅ Speech Recognition initialized');
        } catch (error) {
            console.error('❌ Speech Recognition initialization failed:', error);
        }
    }

    /**
     * Start listening for voice input
     */
    startListening() {
        if (!this.recognition) {
            console.error('❌ Speech Recognition not available');
            return false;
        }

        if (this.isListening) {
            console.warn('⚠️ Already listening');
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('❌ Could not start listening:', error);
            return false;
        }
    }

    /**
     * Stop listening for voice input
     */
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return false;
        }

        try {
            this.recognition.stop();
            return true;
        } catch (error) {
            console.error('❌ Could not stop listening:', error);
            return false;
        }
    }

    /**
     * Speak text using Speech Synthesis API
     * @param {string} text - Text to speak
     * @param {Object} options - Voice options
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('⚠️ Speech Synthesis not supported');
            return false;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.lang || 'de-DE';
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // Try to find a German voice
        const voices = this.synthesis.getVoices();
        const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        if (germanVoice) {
            utterance.voice = germanVoice;
        }

        utterance.onstart = () => {
            this.isSpeaking = true;
            console.log('🔊 Speaking:', text);
            this.onSpeakingStart && this.onSpeakingStart(text);
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            console.log('🔊 Finished speaking');
            this.onSpeakingEnd && this.onSpeakingEnd();
        };

        utterance.onerror = (event) => {
            this.isSpeaking = false;
            console.error('❌ Speech synthesis error:', event);
            this.onSpeakingError && this.onSpeakingError(event);
        };

        this.synthesis.speak(utterance);
        return true;
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (!this.synthesis) {
            return false;
        }

        this.synthesis.cancel();
        this.isSpeaking = false;
        return true;
    }

    /**
     * Send a message to the AI Agent
     * @param {string} message - User message
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} AI response
     */
    async sendMessage(message, options = {}) {
        try {
            if (!message || message.trim() === '') {
                throw new Error('Nachricht ist leer');
            }

            console.log(`🤖 Sending message: "${message}"`);

            // Show loading state
            this.onMessageSending && this.onMessageSending(message);

            // Call Cloud Function
            if (!this.callableFunction) {
                throw new Error('AI Agent nicht initialisiert - rufe initialize() auf');
            }

            const result = await this.callableFunction({
                message: message,
                conversationHistory: this.conversationHistory,
                werkstatt: options.werkstatt || this.werkstatt,
                userId: options.userId || this.userId
            });

            const data = result.data;

            if (!data || !data.success) {
                throw new Error(data?.message || 'Unbekannter Fehler');
            }

            console.log('✅ AI Response:', data);

            // Update conversation history
            if (data.conversationHistory) {
                this.conversationHistory = data.conversationHistory;
            }

            // Call callback
            this.onMessageReceived && this.onMessageReceived(data);

            // Speak response if voice output enabled
            if (options.voiceOutput !== false && data.message) {
                this.speak(data.message);
            }

            return {
                success: true,
                message: data.message,
                toolCalls: data.toolCalls || [],
                conversationHistory: data.conversationHistory || []
            };

        } catch (error) {
            console.error('❌ AI Agent error:', error);

            const errorMessage = `Fehler: ${error.message}`;
            this.onMessageError && this.onMessageError(error);

            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ Conversation history cleared');
        this.onHistoryCleared && this.onHistoryCleared();
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Check if agent is ready
     */
    isReady() {
        return this.callableFunction !== null;
    }

    /**
     * Get available voices for speech synthesis
     */
    getAvailableVoices() {
        if (!this.synthesis) {
            return [];
        }

        return this.synthesis.getVoices();
    }

    /**
     * Check if voice input is supported
     */
    isVoiceInputSupported() {
        return this.recognition !== null;
    }

    /**
     * Check if voice output is supported
     */
    isVoiceOutputSupported() {
        return this.synthesis !== null;
    }

    // ============================================
    // EVENT CALLBACKS (can be overridden)
    // ============================================

    /**
     * Called when message is being sent
     * @param {string} message
     */
    onMessageSending(message) {
        // Override this in your implementation
    }

    /**
     * Called when response is received
     * @param {Object} data - Response data
     */
    onMessageReceived(data) {
        // Override this in your implementation
    }

    /**
     * Called when error occurs
     * @param {Error} error
     */
    onMessageError(error) {
        // Override this in your implementation
    }

    /**
     * Called when listening starts
     */
    onListeningStart() {
        // Override this in your implementation
    }

    /**
     * Called when listening ends
     */
    onListeningEnd() {
        // Override this in your implementation
    }

    /**
     * Called when voice input detected
     * @param {string} transcript
     */
    onVoiceInput(transcript) {
        // Override this in your implementation
    }

    /**
     * Called when listening error occurs
     * @param {string} error
     */
    onListeningError(error) {
        // Override this in your implementation
    }

    /**
     * Called when speaking starts
     * @param {string} text
     */
    onSpeakingStart(text) {
        // Override this in your implementation
    }

    /**
     * Called when speaking ends
     */
    onSpeakingEnd() {
        // Override this in your implementation
    }

    /**
     * Called when speaking error occurs
     * @param {Event} event
     */
    onSpeakingError(event) {
        // Override this in your implementation
    }

    /**
     * Called when history is cleared
     */
    onHistoryCleared() {
        // Override this in your implementation
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

/**
 * Initialize global AI Agent instance
 * Call this after Firebase is loaded
 */
async function initAIAgent() {
    if (window.aiAgent) {
        console.warn('⚠️ AI Agent already initialized');
        return window.aiAgent;
    }

    const agent = new AIAgentEngine();
    const success = await agent.initialize();

    if (success) {
        window.aiAgent = agent;
        console.log('✅ Global AI Agent ready (window.aiAgent)');
        return agent;
    } else {
        console.error('❌ AI Agent initialization failed');
        return null;
    }
}

// ============================================
// EXPORTS
// ============================================

// Make available globally
window.AIAgentEngine = AIAgentEngine;
window.initAIAgent = initAIAgent;

console.log('✅ AI Agent Engine loaded');
console.log('Usage: await initAIAgent() after Firebase is initialized');
