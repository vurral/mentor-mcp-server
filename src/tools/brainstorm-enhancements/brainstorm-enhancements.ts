import type { ToolDefinition, BrainstormEnhancementsArgs, ToolResponse } from '../../types/index.js';
import { makeDeepseekAPICall, checkRateLimit } from '../../api/deepseek/deepseek.js';
import { createPrompt, PromptTemplate, sanitizeInput } from '../../utils/prompt.js';

/**
 * System prompt for the brainstorm enhancements tool
 */
const SYSTEM_PROMPT = `You are an innovative product strategist and creative thinker with expertise in 
various domains. Your role is to generate creative and practical ideas for improving concepts, 
products, or features. Focus on:

1. Innovation and creativity
2. Technical feasibility
3. User value and impact
4. Market differentiation
5. Implementation complexity
6. Resource considerations
7. Competitive advantage

Generate diverse, actionable ideas that balance innovation with practicality.
Consider both immediate improvements and long-term possibilities.
Provide context and rationale for each suggestion.`;

/**
 * Prompt template for brainstorming enhancements
 */
const PROMPT_TEMPLATE: PromptTemplate = {
  template: `Concept to Enhance: {concept}

Please brainstorm potential improvements and enhancements, considering:

1. Core Functionality
   - Essential features
   - Performance aspects
   - Reliability improvements
   - Scalability considerations

2. User Experience
   - Usability enhancements
   - Interface improvements
   - Accessibility features
   - Personalization options

3. Technical Innovation
   - Emerging technologies
   - Novel approaches
   - Integration possibilities
   - Automation opportunities

4. Market Differentiation
   - Competitive advantages
   - Unique selling points
   - Market trends
   - User demands

5. Implementation Considerations
   - Technical feasibility
   - Resource requirements
   - Timeline estimates
   - Potential challenges

Format your response with clear sections for:
1. Quick Wins (immediate, low-effort improvements)
2. Strategic Enhancements (medium-term, moderate complexity)
3. Transformative Ideas (long-term, innovative solutions)
4. Implementation Recommendations

For each suggestion, provide:
- Clear description
- Expected impact
- Implementation complexity
- Resource requirements
- Potential challenges`,
  systemPrompt: SYSTEM_PROMPT
};

/**
 * Tool definition for the brainstorm enhancements tool
 */
export const definition: ToolDefinition = {
  name: 'brainstorm_enhancements',
  description: 'Generates creative ideas for improving a given concept, product, or feature, focusing on innovation, feasibility, and user value.',
  inputSchema: {
    type: 'object',
    properties: {
      concept: {
        type: 'string',
        description: 'A description of the concept, product, or feature to enhance',
      },
    },
    required: ['concept'],
  },
};

/**
 * Handles the execution of the brainstorm enhancements tool
 * 
 * @param args - Tool arguments containing the concept to enhance
 * @returns Tool response containing enhancement suggestions
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
    // Type guard for BrainstormEnhancementsArgs
    if (!('concept' in args) || typeof args.concept !== 'string') {
      return {
        content: [
          {
            type: 'text',
            text: 'Concept parameter is required and must be a string.',
          },
        ],
        isError: true,
      };
    }

    const typedArgs = args as BrainstormEnhancementsArgs;

    // Sanitize input
    const sanitizedConcept = sanitizeInput(typedArgs.concept);

    // Create the complete prompt
    const prompt = createPrompt(PROMPT_TEMPLATE, {
      concept: sanitizedConcept,
    });

    // Make the API call
    const response = await makeDeepseekAPICall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating enhancement ideas: ${response.errorMessage || 'Unknown error'}`,
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
    console.error('Brainstorm enhancements tool error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error processing enhancement ideas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}