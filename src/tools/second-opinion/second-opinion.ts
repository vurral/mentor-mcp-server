import type { ToolDefinition, SecondOpinionArgs } from '../../types/index.js';
import { makeApiCall, checkRateLimit } from '../../api/openrouter/index.js';
import { createPrompt, PromptTemplate } from '../../utils/prompt.js';

/**
 * System prompt for the second opinion tool
 */
const SYSTEM_PROMPT = `You are an expert mentor providing second opinions on user requests. 
Your role is to analyze requests and identify critical considerations that might be overlooked.

First, reason through the request step by step:
1. Understand the core request and its implications
2. Consider the context and domain
3. Identify potential challenges and pitfalls
4. Think about prerequisites and dependencies
5. Evaluate resource requirements
6. Consider maintenance and scalability
7. Think about security and performance implications

Then, provide a concise list of critical considerations based on your reasoning.
Focus on modern practices, potential pitfalls, and important factors for success.`;

/**
 * Prompt template for generating second opinions
 */
const PROMPT_TEMPLATE: PromptTemplate = {
  template: `User Request: {user_request}

Please analyze this request carefully. Consider:
- Core problem/concept to address
- Common pitfalls or edge cases
- Security/performance implications (if applicable)
- Prerequisites and dependencies
- Resource constraints and requirements
- Advanced topics that could add value
- Maintenance/scalability factors

First, reason through your analysis step by step.
Then, provide a clear, non-numbered list of critical considerations.`,
  systemPrompt: SYSTEM_PROMPT
};

/**
 * Tool definition for the second opinion tool
 */
export const definition: ToolDefinition = {
  name: 'second_opinion',
  description: 'Provides a second opinion on a user\'s request by analyzing it with an LLM and listing critical considerations.',
  inputSchema: {
    type: 'object',
    properties: {
      user_request: {
        type: 'string',
        description: 'The user\'s original request (e.g., \'Explain Python to me\' or \'Build a login system\')',
      },
    },
    required: ['user_request'],
  },
};

/**
 * Handles the execution of the second opinion tool
 * 
 * @param args - Tool arguments containing the user request
 * @returns Tool response containing the generated second opinion with reasoning
 */
export async function handler(args: unknown) {
  // Check rate limit first
  if (!checkRateLimit()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Rate limit exceeded. Please try again later.',
        },
      ],
      isError: true,
    };
  }

  try {
    // Type guard for SecondOpinionArgs
    if (!args || typeof args !== 'object' || !('user_request' in args) || 
        typeof args.user_request !== 'string') {
      return {
        content: [
          {
            type: 'text',
            text: 'Missing or invalid user_request parameter.',
          },
        ],
        isError: true,
      };
    }

    const typedArgs = args as SecondOpinionArgs;

    // Create the complete prompt
    const prompt = createPrompt(PROMPT_TEMPLATE, {
      user_request: typedArgs.user_request
    });

    // Make the API call
    const response = await makeApiCall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating second opinion: ${response.errorMessage || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    // Return both the reasoning and the final response
    return {
      content: [
        {
          type: 'text',
          text: response.text,
        },
      ],
      // Include the Chain of Thought reasoning if available
      ...(response.reasoning ? {
        reasoning: [
          {
            type: 'text',
            text: `<reasoning>\n${response.reasoning}\n</reasoning>`,
          },
        ],
      } : {}),
    };
  } catch (error) {
    console.error('Second opinion tool error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}