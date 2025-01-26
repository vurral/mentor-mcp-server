import axios, { AxiosError, AxiosInstance } from 'axios';
import type { LLMResponse } from '../../types/index.js';
import { config } from '../../config.js';
import { sanitizeInput } from '../../utils/prompt.js';

/**
 * Interface for Deepseek API message format
 */
interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface for Deepseek API response format
 */
interface DeepseekResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Interface for API error response
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
}

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
 * Deepseek API client class
 */
class DeepseekClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly rateLimiter: RateLimiter;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api.apiKey}`,
      },
    });

    this.rateLimiter = new RateLimiter(
      50,  // max 50 requests
      10   // refill 10 tokens per second
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      this.handleApiError.bind(this)
    );
  }

  /**
   * Handles API errors and transforms them into appropriate responses
   */
  private async handleApiError(error: AxiosError<ApiErrorResponse>): Promise<never> {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error || error.message;

      switch (status) {
        case 401:
          throw new Error('Authentication failed: Invalid API key');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('Deepseek API server error. Please try again later.');
        default:
          throw new Error(`API error: ${message}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from Deepseek API');
    } else {
      // Something happened in setting up the request
      throw new Error(`Error setting up request: ${error.message}`);
    }
  }

  /**
   * Makes a call to the Deepseek API with exponential backoff retry
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
        if (error instanceof AxiosError && error.response?.status === 429) {
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
   * Makes a call to the Deepseek API
   */
  public async makeApiCall(
    prompt: string,
    systemPrompt: string = 'You are a helpful AI assistant.'
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

      const messages: DeepseekMessage[] = [
        {
          role: 'system',
          content: sanitizedSystemPrompt,
        },
        {
          role: 'user',
          content: sanitizedPrompt,
        },
      ];

      const response = await this.retryWithExponentialBackoff(async () => {
        const result = await this.axiosInstance.post<DeepseekResponse>('/chat/completions', {
          model: config.api.model,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        });
        return result;
      });

      return {
        text: response.data.choices[0].message.content,
        isError: false,
      };
    } catch (error) {
      console.error('Deepseek API error:', error);
      return {
        text: '',
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
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
export const deepseekClient = new DeepseekClient();

// Export the main interface functions
export const makeDeepseekAPICall = (prompt: string, systemPrompt?: string) => 
  deepseekClient.makeApiCall(prompt, systemPrompt);

export const checkRateLimit = () => deepseekClient.checkRateLimit();