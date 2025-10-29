/**
 * ============================================
 * AI AGENT ENGINE - Frontend Integration
 * ============================================
 *
 * Manages AI Agent interactions on the frontend:
 * - Calls Firebase Cloud Function aiAgentExecute
 * - Handles conversation history
 * - Voice input (MediaRecorder API + OpenAI Whisper)
 * - Voice output (Speech Synthesis API)
 * - UI integration
 *
 * Architecture: Client → Cloud Function → OpenAI Whisper/GPT-4 → Tools
 * Language: German
 */

class AIAgentEngine {
    constructor() {
        this.conversationHistory = [];
        this.isRecording = false;
        this.isSpeaking = false;
        this.recorder = null;
        this.audioChunks = [];
        this.synthesis = window.speechSynthesis;
        this.werkstatt = this.detectWerkstatt();
        this.userId = this.getUserId();
        this.callableFunction = null;
        this.whisperCallableFunction = null;
        this.ttsCallableFunction = null;
        this.currentAudio = null; // Current playing audio element
        this.useBrowserTTS = false; // Fallback flag

        console.log('🤖 AI Agent Engine initialized (OpenAI Whisper + TTS)');
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

            // Get callable function references (europe-west3 for DSGVO compliance)
            // Compat API requires firebase.app().functions('region')
            this.callableFunction = firebase.app().functions('europe-west3').httpsCallable('aiAgentExecute');
            this.whisperCallableFunction = firebase.app().functions('europe-west3').httpsCallable('whisperTranscribe');
            this.ttsCallableFunction = firebase.app().functions('europe-west3').httpsCallable('synthesizeSpeech');
            console.log('✅ AI Agent callable functions ready (aiAgentExecute, whisperTranscribe, synthesizeSpeech)');

            // Initialize Audio Recording (MediaRecorder API)
            this.initializeAudioRecording();

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
     * Initialize MediaRecorder API for audio recording
     */
    async initializeAudioRecording() {
        try {
            // Check MediaRecorder support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('⚠️ MediaRecorder not supported in this browser');
                return;
            }

            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create MediaRecorder with WebM format (widely supported)
            const options = { mimeType: 'audio/webm;codecs=opus' };
            this.recorder = new MediaRecorder(stream, options);

            // Event: Recording starts
            this.recorder.onstart = () => {
                this.isRecording = true;
                this.audioChunks = [];
                console.log('🎤 Recording started...');
                this.onListeningStart && this.onListeningStart();
            };

            // Event: Data available (during recording)
            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log(`📊 Audio chunk received: ${event.data.size} bytes`);
                }
            };

            // Event: Recording stops
            this.recorder.onstop = async () => {
                this.isRecording = false;
                console.log('🎤 Recording stopped');
                this.onListeningEnd && this.onListeningEnd();

                // Process recorded audio
                await this.handleRecordingStop();
            };

            // Event: Recording error
            this.recorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event.error);
                this.isRecording = false;
                this.onListeningError && this.onListeningError('aufnahme_fehler');
            };

            console.log('✅ Audio Recording initialized (MediaRecorder + OpenAI Whisper)');
        } catch (error) {
            console.error('❌ Audio Recording initialization failed:', error);

            if (error.name === 'NotAllowedError') {
                this.onListeningError && this.onListeningError('berechtigung_verweigert');
            } else if (error.name === 'NotFoundError') {
                this.onListeningError && this.onListeningError('kein_mikrofon');
            } else {
                this.onListeningError && this.onListeningError('aufnahme_fehler');
            }
        }
    }

    /**
     * Start recording audio
     */
    startRecording() {
        if (!this.recorder) {
            console.error('❌ Audio Recorder not available');
            return false;
        }

        if (this.isRecording) {
            console.warn('⚠️ Already recording');
            return false;
        }

        try {
            this.recorder.start();
            console.log('🎤 Recording started...');
            return true;
        } catch (error) {
            console.error('❌ Could not start recording:', error);
            return false;
        }
    }

    /**
     * Stop recording audio
     */
    stopRecording() {
        if (!this.recorder || !this.isRecording) {
            return false;
        }

        try {
            this.recorder.stop();
            console.log('⏸️ Stopping recording...');
            return true;
        } catch (error) {
            console.error('❌ Could not stop recording:', error);
            return false;
        }
    }

    /**
     * Handle recording stop event - process audio and send to Whisper
     */
    async handleRecordingStop() {
        try {
            // Check if we have audio chunks
            if (this.audioChunks.length === 0) {
                console.warn('⚠️ No audio recorded');
                this.onListeningError && this.onListeningError('keine_sprache');
                return;
            }

            // Create audio blob from chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const audioSizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
            console.log(`📦 Audio blob created: ${audioSizeMB} MB`);

            // Check size (OpenAI Whisper limit: 25 MB)
            if (audioBlob.size > 25 * 1024 * 1024) {
                console.error('❌ Audio too large (>25 MB)');
                this.onListeningError && this.onListeningError('audio_zu_gross');
                return;
            }

            // Send to Whisper API
            await this.sendAudioToWhisper(audioBlob);

        } catch (error) {
            console.error('❌ Error processing recorded audio:', error);
            this.onListeningError && this.onListeningError('verarbeitung_fehler');
        }
    }

    /**
     * Send audio blob to OpenAI Whisper via Firebase Cloud Function
     * @param {Blob} audioBlob - Recorded audio blob
     */
    async sendAudioToWhisper(audioBlob) {
        try {
            console.log('🚀 Sending audio to Whisper API...');

            // Show loading state
            this.onMessageSending && this.onMessageSending('🎤 Transkribiere Sprache...');

            // Convert blob to base64
            const base64Audio = await this.blobToBase64(audioBlob);

            // Call Cloud Function
            if (!this.whisperCallableFunction) {
                throw new Error('Whisper Cloud Function nicht initialisiert');
            }

            const result = await this.whisperCallableFunction({
                audio: base64Audio,
                language: 'de'
            });

            const data = result.data;

            if (!data || !data.success) {
                throw new Error(data?.message || 'Whisper Transkription fehlgeschlagen');
            }

            console.log('✅ Whisper transcription:', data.text);
            console.log(`⏱️ Duration: ${data.duration}s`);

            // Trigger voice input callback
            this.onVoiceInput && this.onVoiceInput(data.text);

            // Automatically send the transcribed message
            await this.sendMessage(data.text);

        } catch (error) {
            console.error('❌ Whisper transcription error:', error);
            this.onListeningError && this.onListeningError('transkription_fehler');
            this.onMessageError && this.onMessageError(error);
        }
    }

    /**
     * Convert Blob to Base64 string
     * @param {Blob} blob - Audio blob
     * @returns {Promise<string>} Base64-encoded audio
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data URL prefix (data:audio/webm;base64,)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Speak text using OpenAI TTS API (with fallback to Browser TTS)
     * @param {string} text - Text to speak
     * @param {Object} options - Voice options
     */
    async speak(text, options = {}) {
        // Stop any ongoing speech
        this.stopSpeaking();

        // Try OpenAI TTS first (unless explicitly disabled or fallback mode)
        if (!this.useBrowserTTS && this.ttsCallableFunction) {
            try {
                await this.speakWithOpenAI(text, options);
                return true;
            } catch (error) {
                console.warn('⚠️ OpenAI TTS failed, falling back to Browser TTS:', error.message);
                // Don't set useBrowserTTS permanently - retry next time
            }
        }

        // Fallback: Browser Speech Synthesis API
        return this.speakWithBrowser(text, options);
    }

    /**
     * Speak text using OpenAI TTS API
     * @param {string} text - Text to speak
     * @param {Object} options - Voice options
     */
    async speakWithOpenAI(text, options = {}) {
        try {
            console.log('🔊 Speaking with OpenAI TTS:', text);

            // Mark as speaking
            this.isSpeaking = true;
            this.onSpeakingStart && this.onSpeakingStart(text);

            // Call Cloud Function
            if (!this.ttsCallableFunction) {
                throw new Error('TTS Cloud Function nicht initialisiert');
            }

            const result = await this.ttsCallableFunction({
                text: text,
                voice: options.voice || 'fable', // Default: fable (best for German)
                model: options.model || 'tts-1-hd', // Default: HD quality
                format: 'mp3' // MP3 best for browser
            });

            const data = result.data;

            if (!data || !data.success) {
                throw new Error(data?.message || 'TTS fehlgeschlagen');
            }

            console.log(`✅ TTS Audio received: ${(data.audioSizeBytes / 1024).toFixed(2)} KB, duration: ${data.duration}s`);

            // Convert base64 to audio blob
            const audioBlob = this.base64ToAudioBlob(data.audio, data.format);

            // Play audio
            await this.playAudioBlob(audioBlob);

            console.log('🔊 Finished speaking (OpenAI TTS)');

        } catch (error) {
            this.isSpeaking = false;
            console.error('❌ OpenAI TTS error:', error);
            this.onSpeakingError && this.onSpeakingError(error);
            throw error;
        }
    }

    /**
     * Speak text using Browser Speech Synthesis API (Fallback)
     * @param {string} text - Text to speak
     * @param {Object} options - Voice options
     */
    speakWithBrowser(text, options = {}) {
        if (!this.synthesis) {
            console.warn('⚠️ Speech Synthesis not supported');
            return false;
        }

        console.log('🔊 Speaking with Browser TTS (fallback):', text);

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
            this.onSpeakingStart && this.onSpeakingStart(text);
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            console.log('🔊 Finished speaking (Browser TTS)');
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
     * Convert Base64 string to Audio Blob
     * @param {string} base64 - Base64-encoded audio
     * @param {string} format - Audio format (mp3, opus, etc.)
     * @returns {Blob} Audio blob
     */
    base64ToAudioBlob(base64, format = 'mp3') {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: `audio/${format}` });
    }

    /**
     * Play Audio Blob using HTML5 Audio API
     * @param {Blob} audioBlob - Audio blob to play
     * @returns {Promise<void>} Resolves when audio finishes playing
     */
    playAudioBlob(audioBlob) {
        return new Promise((resolve, reject) => {
            // Stop current audio if playing
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            // Create audio element
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioBlob);
            this.currentAudio = audio;

            // Event: Audio starts playing
            audio.onplay = () => {
                console.log('▶️ Audio playback started');
            };

            // Event: Audio ends
            audio.onended = () => {
                this.isSpeaking = false;
                this.currentAudio = null;
                URL.revokeObjectURL(audio.src); // Clean up
                this.onSpeakingEnd && this.onSpeakingEnd();
                resolve();
            };

            // Event: Audio error
            audio.onerror = (error) => {
                this.isSpeaking = false;
                this.currentAudio = null;
                URL.revokeObjectURL(audio.src); // Clean up
                console.error('❌ Audio playback error:', error);
                this.onSpeakingError && this.onSpeakingError(error);
                reject(error);
            };

            // Start playback
            audio.play().catch((error) => {
                this.isSpeaking = false;
                this.currentAudio = null;
                URL.revokeObjectURL(audio.src);
                console.error('❌ Audio play() failed:', error);
                reject(error);
            });
        });
    }

    /**
     * Stop speaking (both OpenAI TTS and Browser TTS)
     */
    stopSpeaking() {
        // Stop OpenAI TTS audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Stop Browser TTS
        if (this.synthesis) {
            this.synthesis.cancel();
        }

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
        return this.recorder !== null;
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
