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
  reasoning?: ToolContent[];  // Added to expose reasoning content
  isError?: boolean;
}

export interface LLMResponse {
  text: string;
  reasoning?: string;  // Added for Chain of Thought content
  isError: boolean;
  errorMessage?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Configuration for the Deepseek API
 */
export interface APIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxRetries: number;
  timeout: number;
  maxTokens: number;
}

export interface ServerConfig {
  serverName: string;
  serverVersion: string;
  api: APIConfig;
}

// Tool-specific argument types
export interface SecondOpinionArgs {
  user_request: string;
}

export interface CodeReviewArgs {
  file_path?: string;
  language: string;
  code_snippet?: string;
}

export interface DesignCritiqueArgs {
  design_document: string;
  design_type: string;
}

export interface WritingFeedbackArgs {
  text: string;
  writing_type: string;
}

export interface BrainstormEnhancementsArgs {
  concept: string;
}

// Type guard for tool arguments
export function isValidToolArgs(args: Record<string, unknown> | undefined, required: string[]): boolean {
  if (!args) return false;
  return required.every(key => key in args && args[key] !== undefined);
}

// Type guards for specific tool arguments
export function isCodeReviewArgs(args: unknown): args is CodeReviewArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  
  // Must have either file_path or code_snippet
  const hasFilePath = 'file_path' in a && (typeof a.file_path === 'string' || a.file_path === undefined);
  const hasCodeSnippet = 'code_snippet' in a && (typeof a.code_snippet === 'string' || a.code_snippet === undefined);
  const hasLanguage = 'language' in a && typeof a.language === 'string';
  
  return hasLanguage && (hasFilePath || hasCodeSnippet);
}

export function isDesignCritiqueArgs(args: unknown): args is DesignCritiqueArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  
  return 'design_document' in a && 'design_type' in a &&
         typeof a.design_document === 'string' && typeof a.design_type === 'string';
}

export function isWritingFeedbackArgs(args: unknown): args is WritingFeedbackArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  
  return 'text' in a && 'writing_type' in a &&
         typeof a.text === 'string' && typeof a.writing_type === 'string';
}

export function isBrainstormEnhancementsArgs(args: unknown): args is BrainstormEnhancementsArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  
  return 'concept' in a && typeof a.concept === 'string';
}

// Message types for OpenAI/Deepseek chat
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatHistory {
  messages: ChatMessage[];
}