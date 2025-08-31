#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WeatherService } from './weather/weather.service.js';
import { ConfigService } from '@nestjs/config';

class WeatherMCPServer {
  private server: Server;
  private weatherService: WeatherService;

  constructor() {
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    const configService = new ConfigService();
    this.weatherService = new WeatherService(configService);

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get-weather',
            description: 'Get current weather information for a city',
            inputSchema: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'The city name to get weather for',
                },
                units: {
                  type: 'string',
                  enum: ['metric', 'imperial'],
                  description: 'Temperature units (metric for Celsius, imperial for Fahrenheit)',
                  default: 'metric',
                },
              },
              required: ['city'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'get-weather') {
        try {
          const weather = await this.weatherService.getWeatherByCity(
            args.city,
            args.units || 'metric'
          );
          const weatherText = this.weatherService.formatWeatherForDisplay(weather);

          return {
            content: [
              {
                type: 'text',
                text: weatherText,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting weather: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP stdio server started');
  }
}

const server = new WeatherMCPServer();
server.run().catch(console.error);