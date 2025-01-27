import type { ToolDefinition, DesignCritiqueArgs, ToolResponse } from '../../types/index.js';
import { makeApiCall, checkRateLimit } from '../../api/openrouter/index.js';
import { createPrompt, PromptTemplate, sanitizeInput } from '../../utils/prompt.js';

/**
 * System prompt for the design critique tool
 */
const SYSTEM_PROMPT = `You are an expert design critic with extensive experience in UI/UX design, 
system architecture, and various design methodologies. Your role is to provide constructive feedback 
on designs, focusing on:

1. Usability and user experience
2. Visual design and aesthetics
3. Consistency and coherence
4. Accessibility considerations
5. Technical feasibility
6. Industry best practices
7. Potential improvements

Provide clear, actionable feedback that helps improve the design while acknowledging its strengths.
Structure your critique to cover both high-level concepts and specific details.`;

/**
 * Prompt templates for different design types
 */
const DESIGN_TYPE_PROMPTS: Record<string, string> = {
  'web UI': `Analyze this web UI design focusing on:
- Visual hierarchy and layout
- Navigation and information architecture
- Responsive design considerations
- Color scheme and typography
- Interactive elements and micro-interactions
- Loading states and error handling
- Cross-browser compatibility
- Mobile responsiveness`,

  'mobile app': `Analyze this mobile app design focusing on:
- Platform-specific design guidelines (iOS/Android)
- Touch interactions and gestures
- Screen transitions and navigation flow
- App state management
- Offline functionality
- Performance considerations
- Device compatibility`,

  'system architecture': `Analyze this system architecture design focusing on:
- Scalability and performance
- Reliability and fault tolerance
- Security considerations
- Data flow and management
- Integration points
- Deployment considerations
- Monitoring and maintenance
- Cost implications`,

  'default': `Analyze this design focusing on:
- Overall effectiveness and clarity
- User experience and usability
- Technical feasibility
- Industry best practices
- Potential improvements
- Implementation considerations
- Maintenance aspects`
};

/**
 * Base prompt template for design critique
 */
const BASE_PROMPT_TEMPLATE: PromptTemplate = {
  template: `Design Type: {design_type}

Design Document/Description:
{design_document}

{type_specific_prompts}

Please provide a comprehensive critique covering:
1. Overall Assessment
2. Strengths
3. Areas for Improvement
4. Specific Recommendations
5. Implementation Considerations

Focus on providing actionable feedback that can be used to improve the design.`,
  systemPrompt: SYSTEM_PROMPT
};

/**
 * Tool definition for the design critique tool
 */
export const definition: ToolDefinition = {
  name: 'design_critique',
  description: 'Offers a critique of a design document, UI/UX mockup, or architectural diagram, focusing on usability, aesthetics, consistency, accessibility, and potential design flaws.',
  inputSchema: {
    type: 'object',
    properties: {
      design_document: {
        type: 'string',
        description: 'A description or URL to the design document/image',
      },
      design_type: {
        type: 'string',
        description: "Type of design (e.g., 'web UI', 'system architecture', 'mobile app')",
      },
    },
    required: ['design_document', 'design_type'],
  },
};

/**
 * Handles the execution of the design critique tool
 * 
 * @param args - Tool arguments containing design document and type
 * @returns Tool response containing the design critique
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
    // Type guard for DesignCritiqueArgs
    if (!('design_document' in args) || !('design_type' in args) ||
        typeof args.design_document !== 'string' || typeof args.design_type !== 'string') {
      return {
        content: [
          {
            type: 'text',
            text: 'Both design_document and design_type are required and must be strings.',
          },
        ],
        isError: true,
      };
    }

    const typedArgs = args as DesignCritiqueArgs;

    // Sanitize inputs
    const sanitizedDocument = sanitizeInput(typedArgs.design_document);
    const sanitizedType = sanitizeInput(typedArgs.design_type.toLowerCase());

    // Get type-specific prompts
    const typePrompts = DESIGN_TYPE_PROMPTS[sanitizedType] || DESIGN_TYPE_PROMPTS.default;

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
        design_type: sanitizedType,
        design_document: sanitizedDocument,
      }
    );

    // Make the API call
    const response = await makeApiCall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating design critique: ${response.errorMessage || 'Unknown error'}`,
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
    console.error('Design critique tool error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error processing design critique: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}