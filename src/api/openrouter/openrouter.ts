import OpenAI from 'openai';
import type { LLMResponse, ChatMessage } from '../../types/index.js';
import { config } from '../../config.js';
import { sanitizeInput } from '../../utils/prompt.js';

/**
 * Rate limiter implementation using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number = 50, refillRate: number = 10) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // convert to seconds
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + tokensToAdd
    );
    this.lastRefill = now;
  }

  public tryConsume(): boolean {
    this.refillTokens();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

/**
 * OpenRouter API client class using OpenAI SDK
 */
class OpenRouterClient {
  private readonly client: OpenAI;
  private readonly rateLimiter: RateLimiter;

  constructor() {
    this.client = new OpenAI({
      baseURL: config.api.baseUrl || 'https://openrouter.ai/api/v1',
      apiKey: config.api.apiKey,
      defaultQuery: { model: config.api.model || 'deepseek-coder/33b' }
    });

    this.rateLimiter = new RateLimiter(
      50,  // max 50 requests
      10   // refill 10 tokens per second
    );
  }

  /**
   * Makes a call to the OpenRouter API with exponential backoff retry
   */
  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = config.api.maxRetries,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof OpenAI.APIError && error.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Makes a call to the OpenRouter API
   */
  public async makeApiCall(
    prompt: string,
    systemPrompt: string = 'You are a helpful AI assistant.',
    previousMessages: ChatMessage[] = []
  ): Promise<LLMResponse> {
    // Check rate limit
    if (!this.rateLimiter.tryConsume()) {
      return {
        text: '',
        isError: true,
        errorMessage: 'Rate limit exceeded. Please try again later.'
      };
    }

    try {
      // Sanitize inputs
      const sanitizedPrompt = sanitizeInput(prompt);
      const sanitizedSystemPrompt = sanitizeInput(systemPrompt);

      // Prepare messages
      const messages = [
        { role: 'system' as const, content: sanitizedSystemPrompt },
        ...previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user' as const, content: sanitizedPrompt }
      ];

      const response = await this.retryWithExponentialBackoff(async () => {
        const completion = await this.client.chat.completions.create(
          {
            model: config.api.model || 'deepseek-coder/33b',
            messages,
            max_tokens: config.api.maxTokens || 4096,
          },
          {
            headers: {
              'HTTP-Referer': 'https://github.com/mentor-mcp-server', // Required by OpenRouter
              'X-Title': 'Mentor MCP Server' // Required by OpenRouter
            }
          }
        );

        return completion;
      });

      const finalContent = response.choices[0]?.message?.content || '';

      return {
        text: finalContent,
        isError: false,
      };
    } catch (error) {
      console.error('OpenRouter API error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof OpenAI.APIError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        text: '',
        isError: true,
        errorMessage
      };
    }
  }

  /**
   * Checks if a request can be made (for external rate limit checking)
   */
  public checkRateLimit(): boolean {
    return this.rateLimiter.tryConsume();
  }
}

// Export a singleton instance
export const openRouterClient = new OpenRouterClient();

// Export the main interface functions
export const makeOpenRouterAPICall = (
  prompt: string,
  systemPrompt?: string,
  previousMessages: ChatMessage[] = []
) => openRouterClient.makeApiCall(prompt, systemPrompt, previousMessages);

export const checkRateLimit = () => openRouterClient.checkRateLimit();