import type { ToolDefinition, SecondOpinionArgs } from '../../types/index.js';
import { makeDeepseekAPICall, checkRateLimit } from '../../api/deepseek/deepseek.js';
import { createPrompt, PromptTemplate } from '../../utils/prompt.js';

/**
 * System prompt for the second opinion tool
 */
const SYSTEM_PROMPT = `You are an expert mentor providing second opinions on user requests. 
Your role is to analyze requests and identify critical considerations that might be overlooked. 
Focus on modern practices, potential pitfalls, and important factors for success.

Format your response as a clear, non-numbered list of points, focusing on what's most relevant 
to the specific request. Each point should be concise but informative.`;

/**
 * Prompt template for generating second opinions
 */
const PROMPT_TEMPLATE: PromptTemplate = {
  template: `User Request: {user_request}

Task: List the critical considerations for this user request:
- Core problem/concept to address
- Common pitfalls or edge cases
- Security/performance implications (if applicable)
- Prerequisites or dependencies
- Resource constraints and requirements to consider
- Advanced topics that could add value
- Maintenance/scalability factors

Reminder: You are not fulfilling the user request, only generating a plain text, non-numbered list of non-obvious points of consideration.

Format: Brief, clear points in plain text. Focus on what's most relevant to the specific request.`,
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
 * @returns Tool response containing the generated second opinion
 */
export async function handler(args: SecondOpinionArgs) {
  // Check rate limit first
  if (!checkRateLimit()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Rate limit exceeded. Please try again later.',
        },
      ],
    };
  }

  try {
    // Create the complete prompt using the template
    const prompt = createPrompt(PROMPT_TEMPLATE, {
      user_request: args.user_request
    });

    // Make the API call
    const response = await makeDeepseekAPICall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating second opinion: ${response.errorMessage || 'Unknown error'}`,
          },
        ],
      };
    }

    // Format the response
    return {
      content: [
        {
          type: 'text',
          text: `<internal_thoughts>\n${response.text}\n</internal_thoughts>`,
        },
      ],
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
    };
  }
}