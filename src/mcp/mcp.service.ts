import { Injectable, Logger, Inject } from '@nestjs/common';
import { MCPRequest, MCPResponse, MCPTool, MCPServerCapabilities, MCPError, MCPPrompt, MCPPromptMessage } from './mcp.types';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);

  constructor(private readonly weatherService: WeatherService) {}

  getServerCapabilities(): MCPServerCapabilities {
    return {
      tools: {
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
    };
  }

  getAvailableTools(): MCPTool[] {
    return [
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
    ];
  }

  getAvailablePrompts(): MCPPrompt[] {
    return [
      {
        name: 'weather-report',
        description: 'Generate a comprehensive weather report for a city with analysis and recommendations',
        arguments: [
          {
            name: 'city',
            description: 'The city to get weather for',
            required: true,
          },
          {
            name: 'units',
            description: 'Temperature units (metric or imperial)',
            required: false,
          },
        ],
      },
      {
        name: 'travel-weather-advice',
        description: 'Get weather-based travel advice for multiple cities',
        arguments: [
          {
            name: 'cities',
            description: 'Comma-separated list of cities to check',
            required: true,
          },
          {
            name: 'travel_date',
            description: 'Intended travel date (for context)',
            required: false,
          },
        ],
      },
      {
        name: 'weather-comparison',
        description: 'Compare weather conditions between two cities',
        arguments: [
          {
            name: 'city1',
            description: 'First city to compare',
            required: true,
          },
          {
            name: 'city2',
            description: 'Second city to compare',
            required: true,
          },
        ],
      },
    ];
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    this.logger.log(`Handling MCP request: ${request.method}`);

    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'tools/list':
          return this.handleToolsList(request);
        case 'tools/call':
          return this.handleToolsCall(request);
        case 'prompts/list':
          return this.handlePromptsList(request);
        case 'prompts/get':
          return this.handlePromptsGet(request);
        default:
          return this.createErrorResponse(request.id, -32601, 'Method not found');
      }
    } catch (error) {
      this.logger.error(`Error handling request: ${error.message}`, error.stack);
      return this.createErrorResponse(request.id, -32603, 'Internal error');
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.getServerCapabilities(),
        serverInfo: {
          name: 'weather-mcp-server',
          version: '1.0.0',
        },
      },
    };
  }

  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: this.getAvailableTools(),
      },
    };
  }

  private async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    if (name === 'get-weather') {
      try {
        const weather = await this.weatherService.getWeatherByCity(args.city, args.units || 'metric');
        const weatherText = this.weatherService.formatWeatherForDisplay(weather);
        
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: weatherText,
              },
            ],
          },
        };
      } catch (error) {
        this.logger.error(`Weather tool error: ${error.message}`);
        return this.createErrorResponse(request.id, -32603, `Weather service error: ${error.message}`);
      }
    }

    return this.createErrorResponse(request.id, -32602, 'Unknown tool');
  }

  private handlePromptsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        prompts: this.getAvailablePrompts(),
      },
    };
  }

  private async handlePromptsGet(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'weather-report':
        return this.generateWeatherReportPrompt(args);
      case 'travel-weather-advice':
        return this.generateTravelWeatherAdvicePrompt(args);
      case 'weather-comparison':
        return this.generateWeatherComparisonPrompt(args);
      default:
        return this.createErrorResponse(request.id, -32602, 'Unknown prompt');
    }
  }

  private async generateWeatherReportPrompt(args: any): Promise<MCPResponse> {
    const city = args.city || 'London';
    const units = args.units || 'metric';
    
    const weather = await this.weatherService.getWeatherByCity(city, units);
    const weatherText = this.weatherService.formatWeatherForDisplay(weather);

    const messages: MCPPromptMessage[] = [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please analyze this weather data and provide a comprehensive weather report with insights and recommendations:\n\n${weatherText}\n\nInclude:\n- Current conditions summary\n- Comfort level analysis\n- Activity recommendations\n- What to wear suggestions\n- Any weather alerts or notable conditions`,
        },
      },
    ];

    return {
      jsonrpc: '2.0',
      id: 1,
      result: {
        description: `Comprehensive weather report for ${city}`,
        messages,
      },
    };
  }

  private async generateTravelWeatherAdvicePrompt(args: any): Promise<MCPResponse> {
    const cities = (args.cities || 'London,Paris').split(',').map(c => c.trim());
    const travelDate = args.travel_date || 'today';
    
    const weatherPromises = cities.map(city => 
      this.weatherService.getWeatherByCity(city, 'metric')
    );
    
    const weatherResults = await Promise.all(weatherPromises);
    const weatherTexts = weatherResults.map(weather => 
      this.weatherService.formatWeatherForDisplay(weather)
    ).join('\n\n');

    const messages: MCPPromptMessage[] = [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I'm planning to travel to these cities ${travelDate}. Please analyze the weather conditions and provide travel advice:\n\n${weatherTexts}\n\nPlease provide:\n- Best city for outdoor activities\n- Packing recommendations\n- Transportation considerations\n- Best times to visit each location\n- Any weather-related travel warnings`,
        },
      },
    ];

    return {
      jsonrpc: '2.0',
      id: 1,
      result: {
        description: `Travel weather advice for ${cities.join(', ')}`,
        messages,
      },
    };
  }

  private async generateWeatherComparisonPrompt(args: any): Promise<MCPResponse> {
    const city1 = args.city1 || 'London';
    const city2 = args.city2 || 'Paris';
    
    const [weather1, weather2] = await Promise.all([
      this.weatherService.getWeatherByCity(city1, 'metric'),
      this.weatherService.getWeatherByCity(city2, 'metric'),
    ]);

    const weather1Text = this.weatherService.formatWeatherForDisplay(weather1);
    const weather2Text = this.weatherService.formatWeatherForDisplay(weather2);

    const messages: MCPPromptMessage[] = [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please compare the weather conditions between these two cities and help me decide which has better conditions:\n\n**${city1}:**\n${weather1Text}\n\n**${city2}:**\n${weather2Text}\n\nProvide a detailed comparison including:\n- Temperature and comfort differences\n- Precipitation and visibility\n- Wind conditions\n- Overall weather quality\n- Recommendations for activities in each city`,
        },
      },
    ];

    return {
      jsonrpc: '2.0',
      id: 1,
      result: {
        description: `Weather comparison between ${city1} and ${city2}`,
        messages,
      },
    };
  }

  private createErrorResponse(id: string | number, code: number, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }
}