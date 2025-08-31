import { Controller, Post, Body, Logger } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { MCPRequest, MCPResponse } from './mcp.types';

@Controller('mcp')
export class MCPController {
  private readonly logger = new Logger(MCPController.name);

  constructor(private readonly mcpService: MCPService) {}

  @Post()
  async handleMCPRequest(@Body() request: MCPRequest): Promise<MCPResponse> {
    this.logger.log(`Received MCP request: ${JSON.stringify(request)}`);
    
    const response = await this.mcpService.handleRequest(request);
    
    this.logger.log(`Sending MCP response: ${JSON.stringify(response)}`);
    return response;
  }
}