import * as fs from 'fs';
import * as path from 'path';
import type { FileValidationResult } from '../types/index.js';

/**
 * Validates a file path to ensure it's safe to access.
 * Prevents directory traversal attacks and ensures the path is within allowed boundaries.
 * 
 * @param filePath - The file path to validate
 * @returns FileValidationResult indicating if the path is valid and any error message
 */
export function validateFilePath(filePath: string): FileValidationResult {
  try {
    // Resolve the absolute path
    const resolvedPath = path.resolve(filePath);
    
    // Get the server's root directory (two levels up from utils)
    const serverRoot = path.resolve(__dirname, '../../');
    
    // Check if the path is within the server root
    if (!resolvedPath.startsWith(serverRoot)) {
      return {
        isValid: false,
        error: 'Access denied: Path is outside the server root directory'
      };
    }

    // Check if the file exists
    if (!fs.existsSync(resolvedPath)) {
      return {
        isValid: false,
        error: 'File not found'
      };
    }

    // Check if we have read permissions
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch {
      return {
        isValid: false,
        error: 'Permission denied: Cannot read file'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Safely reads the content of a file after validation.
 * 
 * @param filePath - The path to the file to read
 * @returns Promise resolving to the file content
 * @throws Error if file validation fails or reading fails
 */
export async function readFileContent(filePath: string): Promise<string> {
  const validation = validateFilePath(filePath);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if a file exists and is accessible.
 * 
 * @param filePath - The path to check
 * @returns boolean indicating if the file exists and is accessible
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}