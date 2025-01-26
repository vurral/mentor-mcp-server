#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import * as secondOpinion from "./tools/second-opinion/index.js";
import * as codeReview from "./tools/code-review/index.js";
import * as designCritique from "./tools/design-critique/index.js";
import * as writingFeedback from "./tools/writing-feedback/index.js";
import * as brainstormEnhancements from "./tools/brainstorm-enhancements/index.js";
import {
  isCodeReviewArgs,
  isDesignCritiqueArgs,
  isWritingFeedbackArgs,
  isBrainstormEnhancementsArgs,
  toolResponseToServerResult,
} from "./types/index.js";

/**
 * MentorServer class implements an MCP server that provides mentorship and feedback tools.
 * It uses the Deepseek API to generate insightful responses for various types of requests.
 */
class MentorServer {
  private server: Server;
  private isShuttingDown: boolean = false;

  constructor() {
    // Initialize the MCP server with basic configuration
    this.server = new Server(
      {
        name: config.serverName,
        version: config.serverVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupRequestHandlers();
    this.setupErrorHandler();
    this.setupSignalHandlers();
  }

  /**
   * Sets up request handlers for the MCP server
   */
  private setupRequestHandlers(): void {
    // Register tool listing handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        secondOpinion.definition,
        codeReview.definition,
        designCritique.definition,
        writingFeedback.definition,
        brainstormEnhancements.definition,
      ],
    }));

    // Register tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Check if server is shutting down
      if (this.isShuttingDown) {
        throw new McpError(
          ErrorCode.InternalError,
          "Server is shutting down"
        );
      }

      const { name, arguments: args } = request.params;

      try {
        let response;
        switch (name) {
          case "second_opinion": {
            if (!args || !('user_request' in args) || typeof args.user_request !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing required parameter: user_request"
              );
            }
            response = await secondOpinion.handler({ user_request: args.user_request });
            break;
          }

          case "code_review": {
            if (!isCodeReviewArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Invalid parameters for code review"
              );
            }
            response = await codeReview.handler(args);
            break;
          }

          case "design_critique": {
            if (!isDesignCritiqueArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Invalid parameters for design critique"
              );
            }
            response = await designCritique.handler(args);
            break;
          }

          case "writing_feedback": {
            if (!isWritingFeedbackArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Invalid parameters for writing feedback"
              );
            }
            response = await writingFeedback.handler(args);
            break;
          }

          case "brainstorm_enhancements": {
            if (!isBrainstormEnhancementsArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Invalid parameters for brainstorm enhancements"
              );
            }
            response = await brainstormEnhancements.handler(args);
            break;
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool not found: ${name}`
            );
        }

        // Convert tool response to server result format
        return toolResponseToServerResult(response);
      } catch (error) {
        // Handle errors that aren't already McpErrors
        if (!(error instanceof McpError)) {
          console.error(`Error executing tool ${name}:`, error);
          throw new McpError(
            ErrorCode.InternalError,
            `Internal server error while executing tool ${name}`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Sets up the error handler for the MCP server
   */
  private setupErrorHandler(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };
  }

  /**
   * Sets up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        await this.stop();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.stop();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Mentor MCP server running on stdio");
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  /**
   * Stops the MCP server gracefully
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.error("Shutting down server...");

    try {
      await this.server.close();
      console.error("Server stopped");
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

// Create and start the server
const server = new MentorServer();
server.start().catch((error) => {
  console.error("Server startup error:", error);
  process.exit(1);
});