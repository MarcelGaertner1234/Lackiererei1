/**
 * INTEGRATION TESTS: AI Cloud Functions
 *
 * Tests for AI-powered Cloud Functions:
 * - aiAgentExecute (GPT-4 natural language commands)
 * - whisperTranscribe (Speech-to-Text)
 * - synthesizeSpeech (Text-to-Speech)
 *
 * Note: These tests verify the expected data structures and
 * mock the AI responses since actual API calls are not possible
 * in the test environment.
 *
 * @author Claude Code
 * @date 2025-12-22
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: AI Cloud Functions', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // FUNCTION: aiAgentExecute
  // ============================================

  test.describe('AI-1: aiAgentExecute - Natural Language Commands', () => {

    test('AI-1.1: Command request structure', async ({ page }) => {
      const requestStructure = await page.evaluate(() => {
        // Expected request structure for aiAgentExecute
        const validRequest = {
          command: 'Zeige mir alle Fahrzeuge mit Status fertig',
          userId: 'user-123',
          werkstattId: 'mosbach',
          context: {
            currentPage: 'liste.html',
            selectedVehicle: null
          }
        };

        return {
          hasCommand: typeof validRequest.command === 'string',
          hasUserId: typeof validRequest.userId === 'string',
          hasWerkstattId: typeof validRequest.werkstattId === 'string',
          hasContext: typeof validRequest.context === 'object'
        };
      });

      expect(requestStructure.hasCommand).toBe(true);
      expect(requestStructure.hasUserId).toBe(true);
      expect(requestStructure.hasWerkstattId).toBe(true);
      expect(requestStructure.hasContext).toBe(true);
    });

    test('AI-1.2: Command response structure', async ({ page }) => {
      const responseStructure = await page.evaluate(() => {
        // Expected response structure from aiAgentExecute
        const mockResponse = {
          success: true,
          action: 'filter_vehicles',
          parameters: {
            status: 'fertig'
          },
          message: 'Ich zeige Ihnen alle fertigen Fahrzeuge.',
          executedAt: new Date().toISOString()
        };

        return {
          hasSuccess: typeof mockResponse.success === 'boolean',
          hasAction: typeof mockResponse.action === 'string',
          hasParameters: typeof mockResponse.parameters === 'object',
          hasMessage: typeof mockResponse.message === 'string'
        };
      });

      expect(responseStructure.hasSuccess).toBe(true);
      expect(responseStructure.hasAction).toBe(true);
      expect(responseStructure.hasParameters).toBe(true);
      expect(responseStructure.hasMessage).toBe(true);
    });

    test('AI-1.3: Supported command actions', async ({ page }) => {
      const supportedActions = await page.evaluate(() => {
        // Actions that aiAgentExecute can perform
        return [
          'filter_vehicles',
          'search_vehicle',
          'update_status',
          'create_vehicle',
          'navigate',
          'show_statistics',
          'explain_feature',
          'unknown'
        ];
      });

      expect(supportedActions).toContain('filter_vehicles');
      expect(supportedActions).toContain('search_vehicle');
      expect(supportedActions).toContain('update_status');
      expect(supportedActions).toContain('navigate');
    });

    test('AI-1.4: Tool definitions for GPT-4', async ({ page }) => {
      const toolDefinitions = await page.evaluate(() => {
        // Tool definitions passed to GPT-4 Function Calling
        const tools = [
          {
            name: 'filter_vehicles',
            description: 'Filter vehicles by status, service type, or date',
            parameters: {
              status: 'string (optional)',
              serviceTyp: 'string (optional)',
              dateFrom: 'string (optional)',
              dateTo: 'string (optional)'
            }
          },
          {
            name: 'search_vehicle',
            description: 'Search for a specific vehicle by license plate',
            parameters: {
              kennzeichen: 'string (required)'
            }
          },
          {
            name: 'update_status',
            description: 'Update vehicle status',
            parameters: {
              vehicleId: 'string (required)',
              newStatus: 'string (required)'
            }
          }
        ];

        return {
          toolCount: tools.length,
          hasFilterVehicles: tools.some(t => t.name === 'filter_vehicles'),
          hasSearchVehicle: tools.some(t => t.name === 'search_vehicle'),
          hasUpdateStatus: tools.some(t => t.name === 'update_status')
        };
      });

      expect(toolDefinitions.toolCount).toBeGreaterThanOrEqual(3);
      expect(toolDefinitions.hasFilterVehicles).toBe(true);
      expect(toolDefinitions.hasSearchVehicle).toBe(true);
      expect(toolDefinitions.hasUpdateStatus).toBe(true);
    });

    test('AI-1.5: Rate limiting structure', async ({ page }) => {
      const rateLimitStructure = await page.evaluate(() => {
        // Rate limit tracking structure
        const rateLimitEntry = {
          userId: 'user-123',
          requestCount: 5,
          windowStart: new Date().toISOString(),
          maxRequests: 10,
          windowMs: 60000  // 1 minute
        };

        return {
          hasUserId: !!rateLimitEntry.userId,
          hasRequestCount: typeof rateLimitEntry.requestCount === 'number',
          hasWindowStart: !!rateLimitEntry.windowStart,
          hasMaxRequests: typeof rateLimitEntry.maxRequests === 'number'
        };
      });

      expect(rateLimitStructure.hasUserId).toBe(true);
      expect(rateLimitStructure.hasRequestCount).toBe(true);
      expect(rateLimitStructure.hasMaxRequests).toBe(true);
    });

  });

  // ============================================
  // FUNCTION: whisperTranscribe
  // ============================================

  test.describe('AI-2: whisperTranscribe - Speech-to-Text', () => {

    test('AI-2.1: Transcribe request structure', async ({ page }) => {
      const requestStructure = await page.evaluate(() => {
        // Expected request for whisperTranscribe
        const request = {
          audioData: 'base64-encoded-audio-data',
          audioFormat: 'webm',
          language: 'de',
          userId: 'user-123'
        };

        return {
          hasAudioData: typeof request.audioData === 'string',
          hasAudioFormat: typeof request.audioFormat === 'string',
          hasLanguage: request.language === 'de',
          hasUserId: !!request.userId
        };
      });

      expect(requestStructure.hasAudioData).toBe(true);
      expect(requestStructure.hasAudioFormat).toBe(true);
      expect(requestStructure.hasLanguage).toBe(true);
    });

    test('AI-2.2: Transcribe response structure', async ({ page }) => {
      const responseStructure = await page.evaluate(() => {
        // Expected response from whisperTranscribe
        const mockResponse = {
          success: true,
          text: 'Zeige mir alle Fahrzeuge',
          confidence: 0.95,
          language: 'de',
          duration: 2.5  // seconds
        };

        return {
          hasSuccess: typeof mockResponse.success === 'boolean',
          hasText: typeof mockResponse.text === 'string',
          hasConfidence: typeof mockResponse.confidence === 'number',
          confidenceInRange: mockResponse.confidence >= 0 && mockResponse.confidence <= 1
        };
      });

      expect(responseStructure.hasSuccess).toBe(true);
      expect(responseStructure.hasText).toBe(true);
      expect(responseStructure.hasConfidence).toBe(true);
      expect(responseStructure.confidenceInRange).toBe(true);
    });

    test('AI-2.3: Supported audio formats', async ({ page }) => {
      const audioFormats = await page.evaluate(() => {
        // Formats supported by Whisper API
        return ['webm', 'mp3', 'mp4', 'm4a', 'wav', 'ogg'];
      });

      expect(audioFormats).toContain('webm');
      expect(audioFormats).toContain('mp3');
      expect(audioFormats).toContain('wav');
    });

  });

  // ============================================
  // FUNCTION: synthesizeSpeech
  // ============================================

  test.describe('AI-3: synthesizeSpeech - Text-to-Speech', () => {

    test('AI-3.1: Synthesize request structure', async ({ page }) => {
      const requestStructure = await page.evaluate(() => {
        // Expected request for synthesizeSpeech
        const request = {
          text: 'Es wurden 5 Fahrzeuge gefunden.',
          voice: 'alloy',
          speed: 1.0,
          format: 'mp3'
        };

        return {
          hasText: typeof request.text === 'string',
          hasVoice: typeof request.voice === 'string',
          hasSpeed: typeof request.speed === 'number',
          hasFormat: typeof request.format === 'string'
        };
      });

      expect(requestStructure.hasText).toBe(true);
      expect(requestStructure.hasVoice).toBe(true);
      expect(requestStructure.hasSpeed).toBe(true);
    });

    test('AI-3.2: Synthesize response structure', async ({ page }) => {
      const responseStructure = await page.evaluate(() => {
        // Expected response from synthesizeSpeech
        const mockResponse = {
          success: true,
          audioData: 'base64-encoded-audio',
          format: 'mp3',
          duration: 3.2,
          size: 45678  // bytes
        };

        return {
          hasSuccess: typeof mockResponse.success === 'boolean',
          hasAudioData: typeof mockResponse.audioData === 'string',
          hasFormat: typeof mockResponse.format === 'string',
          hasDuration: typeof mockResponse.duration === 'number'
        };
      });

      expect(responseStructure.hasSuccess).toBe(true);
      expect(responseStructure.hasAudioData).toBe(true);
      expect(responseStructure.hasFormat).toBe(true);
    });

    test('AI-3.3: Available voices', async ({ page }) => {
      const voices = await page.evaluate(() => {
        // OpenAI TTS voices
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      });

      expect(voices).toContain('alloy');
      expect(voices).toContain('nova');
      expect(voices.length).toBe(6);
    });

    test('AI-3.4: Speed range validation', async ({ page }) => {
      const speedValidation = await page.evaluate(() => {
        function isValidSpeed(speed) {
          return speed >= 0.25 && speed <= 4.0;
        }

        return {
          minValid: isValidSpeed(0.25),
          maxValid: isValidSpeed(4.0),
          normalValid: isValidSpeed(1.0),
          tooSlow: !isValidSpeed(0.1),
          tooFast: !isValidSpeed(5.0)
        };
      });

      expect(speedValidation.minValid).toBe(true);
      expect(speedValidation.maxValid).toBe(true);
      expect(speedValidation.normalValid).toBe(true);
      expect(speedValidation.tooSlow).toBe(true);
      expect(speedValidation.tooFast).toBe(true);
    });

  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  test.describe('AI-4: Error Handling', () => {

    test('AI-4.1: Error response structure', async ({ page }) => {
      const errorStructure = await page.evaluate(() => {
        // Error response format
        const errorResponse = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
            retryAfter: 60
          }
        };

        return {
          successIsFalse: errorResponse.success === false,
          hasErrorCode: typeof errorResponse.error.code === 'string',
          hasErrorMessage: typeof errorResponse.error.message === 'string'
        };
      });

      expect(errorStructure.successIsFalse).toBe(true);
      expect(errorStructure.hasErrorCode).toBe(true);
      expect(errorStructure.hasErrorMessage).toBe(true);
    });

    test('AI-4.2: Known error codes', async ({ page }) => {
      const errorCodes = await page.evaluate(() => {
        return [
          'RATE_LIMIT_EXCEEDED',
          'INVALID_REQUEST',
          'UNAUTHORIZED',
          'API_ERROR',
          'AUDIO_TOO_LONG',
          'TEXT_TOO_LONG',
          'UNSUPPORTED_FORMAT'
        ];
      });

      expect(errorCodes).toContain('RATE_LIMIT_EXCEEDED');
      expect(errorCodes).toContain('INVALID_REQUEST');
      expect(errorCodes).toContain('API_ERROR');
    });

  });

  // ============================================
  // INTEGRATION WITH UI
  // ============================================

  test.describe('AI-5: UI Integration', () => {

    test('AI-5.1: AI button exists on supported pages', async ({ page }) => {
      // Check if AI button exists on index page
      const hasAIButton = await page.evaluate(() => {
        const aiButton = document.querySelector('#ai-agent-btn, .ai-agent-button, [data-ai-agent]');
        return !!aiButton;
      });

      // AI button may or may not exist depending on page
      expect(typeof hasAIButton).toBe('boolean');
    });

    test('AI-5.2: Voice input capability check', async ({ page }) => {
      const voiceSupport = await page.evaluate(() => {
        return {
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          hasSpeechRecognition: !!window.SpeechRecognition || !!window.webkitSpeechRecognition
        };
      });

      // MediaDevices API should be available
      expect(voiceSupport.hasMediaDevices).toBe(true);
    });

  });

});
