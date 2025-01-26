import dotenv from 'dotenv';
import type { ServerConfig, APIConfig } from './types/index.js';

// Load environment variables
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const apiConfig: APIConfig = {
  apiKey: requireEnv('DEEPSEEK_API_KEY'),
  baseUrl: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-coder',
  maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3', 10),
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),
};

export const config: ServerConfig = {
  serverName: process.env.SERVER_NAME || 'mentor-mcp-server',
  serverVersion: process.env.SERVER_VERSION || '1.0.0',
  api: apiConfig,
};