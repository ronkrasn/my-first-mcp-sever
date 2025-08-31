# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS-based Model Context Protocol (MCP) server that provides weather information by city. The server implements the MCP specification to expose weather data through standardized tools and resources.

## Architecture

- **Framework**: NestJS with TypeScript
- **Protocol**: Model Context Protocol (MCP) - JSON-RPC based communication
- **Purpose**: Weather data service that can be consumed by MCP clients (like Claude Desktop)
- **Data Flow**: MCP Client ↔ JSON-RPC ↔ NestJS Server ↔ Weather API

## Common Development Commands

```bash
# Development
npm run start:dev        # Start HTTP server in development mode with hot reload
npm run start           # Start HTTP server in production mode
npm run build          # Build the application

# MCP Development & Testing
npm run mcp:stdio       # Start stdio-based MCP server (for inspector)
npm run inspect         # Launch MCP Inspector with stdio server

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run test:cov       # Run tests with coverage

# Code quality
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## MCP Server Implementation

The server should implement:

1. **MCP Tools**: Functions that can be called by clients (e.g., `get-weather`)
2. **MCP Resources**: Data that can be retrieved (e.g., weather data for specific cities)
3. **Server Capabilities**: Declare what the server supports
4. **Error Handling**: Proper MCP-compliant error responses

## Key NestJS Patterns for MCP

- Use **Controllers** for MCP endpoint handling
- Use **Services** for weather API integration and business logic
- Use **DTOs** for MCP request/response validation
- Use **Guards** for authentication if needed
- Use **Interceptors** for MCP protocol compliance

## Weather Service Integration

The weather functionality should:
- Accept city names as input
- Return structured weather data (temperature, conditions, etc.)
- Handle API rate limits and errors gracefully
- Cache responses when appropriate
- Support both current weather and forecasts

## MCP Protocol Compliance

Ensure responses follow MCP specification:
- Proper JSON-RPC 2.0 format
- Correct method names and parameters
- Appropriate error codes and messages
- Tool result formatting

## MCP Inspector Usage

The project includes both HTTP and stdio-based MCP servers:

**HTTP Server** (for web clients):
- Endpoint: `POST /mcp`
- Start: `npm run start:dev`
- Test: `curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}'`

**Stdio Server** (for MCP Inspector):
- Start inspector: `npm run inspect`
- Direct stdio: `npm run mcp:stdio`
- Compatible with Claude Desktop and other stdio-based MCP clients

The stdio server (`src/mcp-stdio-compiled.js`) provides the same weather functionality but uses stdin/stdout communication protocol required by the MCP Inspector.