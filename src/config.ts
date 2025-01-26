import type { ServerConfig, APIConfig } from './types/index.js';

// Get configuration from process.env which is populated by the MCP client
const apiConfig: APIConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
  maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3', 10),
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),
  maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '8192', 10),
};

// Validate required configuration
if (!apiConfig.apiKey) {
  throw new Error('DEEPSEEK_API_KEY is required');
}

// Validate model name
if (!apiConfig.model.startsWith('deepseek-')) {
  throw new Error('DEEPSEEK_MODEL must be a valid Deepseek model name (e.g., deepseek-reasoner)');
}

// Validate numeric values
if (apiConfig.maxTokens < 1 || apiConfig.maxTokens > 8192) {
  throw new Error('DEEPSEEK_MAX_TOKENS must be between 1 and 8192');
}

if (apiConfig.maxRetries < 1) {
  throw new Error('DEEPSEEK_MAX_RETRIES must be at least 1');
}

if (apiConfig.timeout < 1000) {
  throw new Error('DEEPSEEK_TIMEOUT must be at least 1000ms');
}

export const config: ServerConfig = {
  serverName: 'mentor-mcp-server',
  serverVersion: '1.0.0',
  api: apiConfig,
};