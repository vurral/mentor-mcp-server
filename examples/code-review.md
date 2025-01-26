# Code Review Tool Example

## Request
```json
{
  "code_snippet": "import type { ToolDefinition, CodeReviewArgs, ToolResponse } from '../../types/index.js';\nimport { makeDeepseekAPICall, checkRateLimit } from '../../api/deepseek/deepseek.js';\nimport { readFileContent } from '../../utils/file.js';\nimport { createPrompt, PromptTemplate, sanitizeInput } from '../../utils/prompt.js';\n\nconst SYSTEM_PROMPT = `You are an expert code reviewer...`;\n\nconst PROMPT_TEMPLATE: PromptTemplate = {\n  template: `Review the following {language} code...`,\n  systemPrompt: SYSTEM_PROMPT\n};\n\nexport const definition: ToolDefinition = {\n  name: 'code_review',\n  description: 'Provides a code review...',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      file_path: { type: 'string', description: 'The full path...' },\n      language: { type: 'string', description: 'The programming language...' },\n      code_snippet: { type: 'string', description: 'Optional small code...' }\n    },\n    oneOf: [\n      { required: ['file_path', 'language'] },\n      { required: ['code_snippet', 'language'] }\n    ]\n  }\n};\n\nexport async function handler(args: unknown): Promise<ToolResponse> {\n  if (!checkRateLimit()) {\n    return { content: [{ type: 'text', text: 'Rate limit exceeded' }], isError: true };\n  }\n\n  if (!args || typeof args !== 'object') {\n    return { content: [{ type: 'text', text: 'Invalid arguments' }], isError: true };\n  }\n\n  if (!('language' in args) || typeof args.language !== 'string') {\n    return { content: [{ type: 'text', text: 'Language required' }], isError: true };\n  }\n\n  try {\n    let codeToReview: string;\n    const typedArgs = args as CodeReviewArgs;\n\n    if (typedArgs.file_path) {\n      try {\n        codeToReview = await readFileContent(typedArgs.file_path);\n      } catch (error) {\n        return {\n          content: [{ type: 'text', text: `Error reading file: ${error}` }],\n          isError: true\n        };\n      }\n    } else if (typedArgs.code_snippet) {\n      codeToReview = typedArgs.code_snippet;\n    } else {\n      return {\n        content: [{ type: 'text', text: 'File path or snippet required' }],\n        isError: true\n      };\n    }\n\n    const sanitizedCode = sanitizeInput(codeToReview);\n    const sanitizedLanguage = sanitizeInput(typedArgs.language);\n    const prompt = createPrompt(PROMPT_TEMPLATE, {\n      language: sanitizedLanguage,\n      code: sanitizedCode\n    });\n\n    const response = await makeDeepseekAPICall(prompt, SYSTEM_PROMPT);\n\n    if (response.isError) {\n      return {\n        content: [{ type: 'text', text: `Error: ${response.errorMessage}` }],\n        isError: true\n      };\n    }\n\n    return { content: [{ type: 'text', text: response.text }] };\n  } catch (error) {\n    console.error('Code review error:', error);\n    return {\n      content: [{ type: 'text', text: `Error: ${error}` }],\n      isError: true\n    };\n  }\n}",
  "language": "typescript"
}
```

## Response
```markdown
1. Critical Issues
------------------
- **Unsafe type assertion**: 
  `const typedArgs = args as CodeReviewArgs` bypasses proper type validation. An attacker could send malformed payloads that pass initial checks but fail later.
  
- **Incomplete input validation**:
  While checking for `language`, the code doesn't validate types for `file_path` or `code_snippet`. An invalid numeric `file_path` would throw later.

- **Conflicting input handling**:
  The schema specifies `oneOf` but code prioritizes `file_path` over `code_snippet` if both are present. This contradicts the schema definition.

2. Security Concerns
--------------------
- **Error message leakage**:
  Returning raw error messages (e.g., `Error reading file: ${error}`) could expose sensitive filesystem information.

- **Potential prompt injection**:
  While `sanitizeInput` is used, its implementation isn't shown. Inadequate sanitization could allow LLM prompt injections via user-provided code snippets.

- **Early rate limiting**:
  `checkRateLimit()` is called before input validation, allowing invalid requests to consume rate quota.

3. Performance Considerations
------------------------------
- **Duplicate sanitization**:
  Both `codeToReview` and `language` are sanitized, but this might be redundant if the API layer already handles sanitization.

- **Unbounded file reading**:
  `readFileContent` could cause memory issues with large files. Consider adding size limits.

4. Code Style & Best Practices
-------------------------------
- **Type safety violations**:
  - Using type assertion (`as`) instead of proper type guards
  - No Zod-like validation for input schema
  - `unknown` type in handler parameters not properly narrowed

- **Error handling inconsistencies**:
  - Mix of error return objects and exceptions
  - `console.error` in production code (should use structured logging)

- **Template issues**:
  - Hardcoded SYSTEM_PROMPT makes testing/mocking difficult
  - Prompt construction could be vulnerable to injection if sanitizeInput isn't robust

5. Suggested Improvements
--------------------------
**Input Validation**:
```typescript
// Use type guard instead of assertion
function isCodeReviewArgs(args: unknown): args is CodeReviewArgs {
  return /* detailed property checks */;
}

// Validate file_path format if applicable
if (typedArgs.file_path && !isValidPath(typedArgs.file_path)) {
  return invalidPathError;
}
```

**Security Enhancements**:
- Implement generic error messages:
  ```typescript
  return { 
    content: [{ type: 'text', text: 'File read error' }],
    isError: true
  };
  ```
- Add file size limits:
  ```typescript
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB
  if (fileStats.size > MAX_FILE_SIZE) throw new Error('File too large');
  ```

**Performance Improvements**:
- Move rate limit check after input validation:
  ```typescript
  export async function handler(args: unknown): Promise<ToolResponse> {
    // Validate FIRST
    if (!validateArgs(args)) return invalidArgsResponse;
    
    // Then check rate limits
    if (!checkRateLimit()) return rateLimitResponse;
  ```

**TypeScript Best Practices**:
1. Use Zod for schema validation:
```typescript
import { z } from 'zod';

const CodeReviewSchema = z.union([
  z.object({
    file_path: z.string().min(1),
    language: z.string().min(1)
  }),
  z.object({
    code_snippet: z.string().min(1),
    language: z.string().min(1)
  })
]);
```

2. Implement proper error typing:
```typescript
class CodeReviewError extends Error {
  public readonly isUserSafe: boolean;
  
  constructor(message: string, isUserSafe: boolean) {
    super(message);
    this.isUserSafe = isUserSafe;
  }
}
```

**Architecture Suggestions**:
- Separate validation, business logic, and presentation layers
- Use dependency injection for file system access and API calls
- Implement circuit breakers for the Deepseek API integration
- Add telemetry for code review request metrics

**Additional Considerations**:
- Add timeout handling for file operations and API calls
- Implement content scanning for malicious code patterns in snippets
- Add cache control headers for API responses
- Consider streaming partial responses for large reviews
- Add content security policies for any HTML output