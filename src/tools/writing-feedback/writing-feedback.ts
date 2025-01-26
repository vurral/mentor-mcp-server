import type { ToolDefinition, WritingFeedbackArgs, ToolResponse } from '../../types/index.js';
import { makeDeepseekAPICall, checkRateLimit } from '../../api/deepseek/deepseek.js';
import { createPrompt, PromptTemplate, sanitizeInput } from '../../utils/prompt.js';

/**
 * System prompt for the writing feedback tool
 */
const SYSTEM_PROMPT = `You are an expert writing coach and editor with extensive experience in various forms of writing. 
Your role is to provide constructive feedback on written content, focusing on:

1. Clarity and coherence
2. Grammar and syntax
3. Style and tone
4. Structure and organization
5. Technical accuracy
6. Audience appropriateness
7. Overall effectiveness

Provide specific, actionable feedback that helps improve the writing while maintaining the author's voice.
Your critique should be constructive and include both strengths and areas for improvement.`;

/**
 * Writing type-specific prompts
 */
const WRITING_TYPE_PROMPTS: Record<string, string> = {
  'documentation': `Analyze this technical documentation focusing on:
- Technical accuracy and completeness
- Clarity and accessibility
- Structure and organization
- Code examples and explanations
- Versioning considerations
- API documentation standards
- Troubleshooting guidance
- Maintenance and updates`,

  'essay': `Analyze this essay focusing on:
- Thesis clarity and development
- Argument structure and logic
- Evidence and support
- Transitions and flow
- Introduction and conclusion
- Academic style
- Citations and references
- Overall persuasiveness`,

  'article': `Analyze this article focusing on:
- Hook and engagement
- Content organization
- Clarity and readability
- Supporting evidence
- Target audience appropriateness
- SEO considerations
- Call to action
- Overall impact`,

  'blog': `Analyze this blog post focusing on:
- Reader engagement
- Voice and tone
- Content structure
- SEO optimization
- Visual elements
- Call to action
- Social sharing potential
- Reader value`,

  'default': `Analyze this writing focusing on:
- Clarity and coherence
- Grammar and style
- Structure and flow
- Audience appropriateness
- Content accuracy
- Overall effectiveness
- Specific improvements`
};

/**
 * Base prompt template for writing feedback
 */
const BASE_PROMPT_TEMPLATE: PromptTemplate = {
  template: `Writing Type: {writing_type}

Content to Review:
{text}

{type_specific_prompts}

Please provide comprehensive feedback covering:
1. Overall Assessment
2. Strengths
3. Areas for Improvement
4. Specific Recommendations for:
   - Clarity and Coherence
   - Grammar and Style
   - Structure and Organization
   - Content and Accuracy
5. Summary of Key Action Items

Focus on providing actionable feedback that will help improve the writing while maintaining its intended purpose and voice.`,
  systemPrompt: SYSTEM_PROMPT
};

/**
 * Tool definition for the writing feedback tool
 */
export const definition: ToolDefinition = {
  name: 'writing_feedback',
  description: 'Provides feedback on a piece of writing, such as an essay, article, or technical documentation, focusing on clarity, grammar, style, structure, and overall effectiveness.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to review',
      },
      writing_type: {
        type: 'string',
        description: "The type of writing (e.g., 'essay', 'article', 'documentation')",
      },
    },
    required: ['text', 'writing_type'],
  },
};

/**
 * Handles the execution of the writing feedback tool
 * 
 * @param args - Tool arguments containing text and writing type
 * @returns Tool response containing the writing feedback
 */
export async function handler(args: unknown): Promise<ToolResponse> {
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

  // Validate arguments
  if (!args || typeof args !== 'object') {
    return {
      content: [
        {
          type: 'text',
          text: 'Invalid arguments provided.',
        },
      ],
      isError: true,
    };
  }

  try {
    // Type guard for WritingFeedbackArgs
    if (!('text' in args) || !('writing_type' in args) ||
        typeof args.text !== 'string' || typeof args.writing_type !== 'string') {
      return {
        content: [
          {
            type: 'text',
            text: 'Both text and writing_type are required and must be strings.',
          },
        ],
        isError: true,
      };
    }

    const typedArgs = args as WritingFeedbackArgs;

    // Sanitize inputs
    const sanitizedText = sanitizeInput(typedArgs.text);
    const sanitizedType = sanitizeInput(typedArgs.writing_type.toLowerCase());

    // Get type-specific prompts
    const typePrompts = WRITING_TYPE_PROMPTS[sanitizedType] || WRITING_TYPE_PROMPTS.default;

    // Create the complete prompt
    const prompt = createPrompt(
      {
        ...BASE_PROMPT_TEMPLATE,
        template: BASE_PROMPT_TEMPLATE.template.replace(
          '{type_specific_prompts}',
          typePrompts
        ),
      },
      {
        writing_type: sanitizedType,
        text: sanitizedText,
      }
    );

    // Make the API call
    const response = await makeDeepseekAPICall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating writing feedback: ${response.errorMessage || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    // Return the formatted response
    return {
      content: [
        {
          type: 'text',
          text: response.text,
        },
      ],
    };
  } catch (error) {
    console.error('Writing feedback tool error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error processing writing feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}