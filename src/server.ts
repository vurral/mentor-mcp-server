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
import { isValidToolArgs, SecondOpinionArgs } from "./types/index.js";

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
      tools: [secondOpinion.definition],
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
        switch (name) {
          case "second_opinion": {
            if (!args || !isValidToolArgs(args, ["user_request"])) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing required parameter: user_request"
              );
            }
            
            const userRequest = args.user_request;
            if (typeof userRequest !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                "Parameter 'user_request' must be a string"
              );
            }
            
            const toolArgs: SecondOpinionArgs = {
              user_request: userRequest
            };
            
            return await secondOpinion.handler(toolArgs);
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool not found: ${name}`
            );
        }
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