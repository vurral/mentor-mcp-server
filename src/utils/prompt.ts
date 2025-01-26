/**
 * Represents a prompt template with placeholders for dynamic values.
 */
export interface PromptTemplate {
  template: string;
  systemPrompt?: string;
}

/**
 * Represents variables that can be used in a prompt template.
 */
export type PromptVariables = Record<string, string | number | boolean>;

/**
 * Fills a prompt template with provided variables.
 * 
 * @param template - The prompt template containing placeholders
 * @param variables - Object containing values for the placeholders
 * @returns The filled prompt string
 * @throws Error if required variables are missing
 */
export function fillPromptTemplate(template: string, variables: PromptVariables): string {
  // Find all placeholders in the template
  const placeholders = template.match(/\{([^}]+)\}/g) || [];
  
  // Create a map of required variables
  const requiredVars = new Set(
    placeholders.map(p => p.slice(1, -1)) // Remove { and }
  );

  // Check if all required variables are provided
  const missingVars = Array.from(requiredVars).filter(v => !(v in variables));
  if (missingVars.length > 0) {
    throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
  }

  // Replace all placeholders with their values
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = variables[key];
    return String(value);
  });
}

/**
 * Sanitizes user input to prevent prompt injection attacks.
 * 
 * @param input - The user input to sanitize
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string): string {
  // Remove any attempt to break out of the current context
  return input
    .replace(/```/g, '\\`\\`\\`') // Escape code blocks
    .replace(/\{/g, '\\{')        // Escape template literals
    .replace(/\}/g, '\\}')
    .trim();
}

/**
 * Creates a complete prompt by combining system prompt, template, and variables.
 * 
 * @param promptTemplate - The prompt template object
 * @param variables - Variables to fill in the template
 * @returns Complete prompt string
 */
export function createPrompt(
  promptTemplate: PromptTemplate,
  variables: PromptVariables
): string {
  const filledTemplate = fillPromptTemplate(promptTemplate.template, variables);
  
  if (promptTemplate.systemPrompt) {
    return `${promptTemplate.systemPrompt}\n\n${filledTemplate}`;
  }
  
  return filledTemplate;
}

/**
 * Validates a prompt to ensure it doesn't exceed maximum length.
 * 
 * @param prompt - The prompt to validate
 * @param maxLength - Maximum allowed length (default: 4000)
 * @returns boolean indicating if the prompt is valid
 */
export function validatePrompt(prompt: string, maxLength: number = 4000): boolean {
  return prompt.length <= maxLength;
}

/**
 * Truncates a prompt to fit within maximum length while preserving meaning.
 * 
 * @param prompt - The prompt to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated prompt string
 */
export function truncatePrompt(prompt: string, maxLength: number = 4000): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  // Try to truncate at a sentence boundary
  const truncated = prompt.slice(0, maxLength);
  const lastSentence = truncated.match(/.*[.!?]/);
  
  if (lastSentence) {
    return lastSentence[0];
  }

  // If no sentence boundary found, truncate at last complete word
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '...';
}