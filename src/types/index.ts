import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface ToolDefinition extends Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    oneOf?: Array<{ required: string[] }>;
  };
}

export interface ToolContent {
  type: string;
  text: string;
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

export interface LLMResponse {
  text: string;
  isError: boolean;
  errorMessage?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface APIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxRetries: number;
  timeout: number;
}

export interface ServerConfig {
  serverName: string;
  serverVersion: string;
  api: APIConfig;
}

export interface SecondOpinionArgs {
  user_request: string;
}

// Type guard for tool arguments
export function isValidToolArgs(args: Record<string, unknown> | undefined, required: string[]): boolean {
  if (!args) return false;
  return required.every(key => key in args && args[key] !== undefined);
}