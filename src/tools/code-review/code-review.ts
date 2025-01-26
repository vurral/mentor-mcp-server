import type { ToolDefinition, CodeReviewArgs, ToolResponse } from '../../types/index.js';
import { makeDeepseekAPICall, checkRateLimit } from '../../api/deepseek/deepseek.js';
import { readFileContent } from '../../utils/file.js';
import { createPrompt, PromptTemplate, sanitizeInput } from '../../utils/prompt.js';

/**
 * System prompt for the code review tool
 */
const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software development best practices, 
security considerations, and performance optimization. Your task is to analyze code and provide detailed, 
actionable feedback focusing on:

1. Potential bugs and logic issues
2. Security vulnerabilities
3. Performance bottlenecks
4. Code style and maintainability
5. Best practices and patterns
6. Possible improvements

Format your response as a clear, structured analysis with sections for different types of findings.
Be specific and provide examples or suggestions where applicable.`;

/**
 * Prompt template for code review
 */
const PROMPT_TEMPLATE: PromptTemplate = {
  template: `Review the following {language} code and provide comprehensive feedback:

\`\`\`{language}
{code}
\`\`\`

Please analyze the code for:
- Potential bugs or logic errors
- Security vulnerabilities
- Performance optimization opportunities
- Code style and maintainability issues
- Adherence to {language} best practices
- Possible improvements or alternative approaches

Format your response with clear sections for:
1. Critical Issues (if any)
2. Security Concerns
3. Performance Considerations
4. Code Style & Best Practices
5. Suggested Improvements`,
  systemPrompt: SYSTEM_PROMPT
};

/**
 * Tool definition for the code review tool
 */
export const definition: ToolDefinition = {
  name: 'code_review',
  description: 'Provides a code review for a given file or code snippet, focusing on potential bugs, style issues, performance bottlenecks, and security vulnerabilities.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The full path to the local file containing the code to review',
      },
      language: {
        type: 'string',
        description: 'The programming language of the code',
      },
      code_snippet: {
        type: 'string',
        description: 'Optional small code snippet for quick reviews (alternative to file_path)',
      },
    },
    oneOf: [
      { required: ['file_path', 'language'] },
      { required: ['code_snippet', 'language'] },
    ],
  },
};

/**
 * Handles the execution of the code review tool
 * 
 * @param args - Tool arguments containing either file path or code snippet, and language
 * @returns Tool response containing the code review feedback
 */
export async function handler(args: unknown): Promise<ToolResponse> {
  // Validate arguments
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

  // Type guard for CodeReviewArgs
  if (!('language' in args) || typeof args.language !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'Language parameter is required and must be a string.',
        },
      ],
      isError: true,
    };
  }

  try {
    let codeToReview: string;
    const typedArgs = args as CodeReviewArgs;

    // Get code from either file or snippet
    if (typedArgs.file_path) {
      try {
        codeToReview = await readFileContent(typedArgs.file_path);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    } else if (typedArgs.code_snippet) {
      codeToReview = typedArgs.code_snippet;
    } else {
      return {
        content: [
          {
            type: 'text',
            text: 'Either file_path or code_snippet must be provided.',
          },
        ],
        isError: true,
      };
    }

    // Sanitize inputs
    const sanitizedCode = sanitizeInput(codeToReview);
    const sanitizedLanguage = sanitizeInput(typedArgs.language);

    // Create the complete prompt
    const prompt = createPrompt(PROMPT_TEMPLATE, {
      language: sanitizedLanguage,
      code: sanitizedCode,
    });

    // Make the API call
    const response = await makeDeepseekAPICall(prompt, SYSTEM_PROMPT);

    if (response.isError) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating code review: ${response.errorMessage || 'Unknown error'}`,
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
    console.error('Code review tool error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error processing code review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}