#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || 'demo-key';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    
    if (this.apiKey === 'demo-key') {
      console.error('Using demo API key. Set OPENWEATHER_API_KEY environment variable for production use.');
    }
  }

  async getWeatherByCity(city, units = 'metric') {
    if (!city || city.trim().length === 0) {
      throw new Error('City name is required');
    }

    // If using demo key, return mock data
    if (this.apiKey === 'demo-key') {
      return this.getMockWeatherData(city, units);
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: city,
          appid: this.apiKey,
          units: units,
        },
        timeout: 10000,
      });

      return this.transformWeatherData(response.data, units);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`City "${city}" not found`);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }

      throw new Error('Failed to fetch weather data');
    }
  }

  transformWeatherData(data, units) {
    return {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      visibility: data.visibility,
      units,
      timestamp: new Date(),
    };
  }

  getMockWeatherData(city, units) {
    const isMetric = units === 'metric';
    
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase(),
      country: 'XX',
      temperature: isMetric ? 22 : 72,
      feelsLike: isMetric ? 24 : 75,
      humidity: 65,
      pressure: 1013,
      description: 'partly cloudy',
      windSpeed: isMetric ? 5.2 : 11.6,
      windDirection: 180,
      visibility: 10000,
      units,
      timestamp: new Date(),
    };
  }

  formatWeatherForDisplay(weather) {
    const tempUnit = weather.units === 'metric' ? '°C' : '°F';
    const speedUnit = weather.units === 'metric' ? 'm/s' : 'mph';
    
    return `Weather in ${weather.city}, ${weather.country}:
Temperature: ${weather.temperature}${tempUnit} (feels like ${weather.feelsLike}${tempUnit})
Condition: ${weather.description}
Humidity: ${weather.humidity}%
Pressure: ${weather.pressure} hPa
Wind: ${weather.windSpeed} ${speedUnit} at ${weather.windDirection}°
Visibility: ${weather.visibility / 1000} km
Last updated: ${weather.timestamp.toISOString()}`;
  }
}

class WeatherMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.weatherService = new WeatherService();
    this.setupToolHandlers();
    this.setupPromptHandlers();
  }

  setupToolHandlers() {
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
        } catch (error) {
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

  setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
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
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'weather-report':
          return this.generateWeatherReportPrompt(args || {});
        case 'travel-weather-advice':
          return this.generateTravelWeatherAdvicePrompt(args || {});
        case 'weather-comparison':
          return this.generateWeatherComparisonPrompt(args || {});
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  async generateWeatherReportPrompt(args) {
    const city = args.city || 'London';
    const units = args.units || 'metric';
    
    const weather = await this.weatherService.getWeatherByCity(city, units);
    const weatherText = this.weatherService.formatWeatherForDisplay(weather);

    return {
      description: `Comprehensive weather report for ${city}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze this weather data and provide a comprehensive weather report with insights and recommendations:\n\n${weatherText}\n\nInclude:\n- Current conditions summary\n- Comfort level analysis\n- Activity recommendations\n- What to wear suggestions\n- Any weather alerts or notable conditions`,
          },
        },
      ],
    };
  }

  async generateTravelWeatherAdvicePrompt(args) {
    const cities = (args.cities || 'London,Paris').split(',').map(c => c.trim());
    const travelDate = args.travel_date || 'today';
    
    const weatherPromises = cities.map(city => 
      this.weatherService.getWeatherByCity(city, 'metric')
    );
    
    const weatherResults = await Promise.all(weatherPromises);
    const weatherTexts = weatherResults.map(weather => 
      this.weatherService.formatWeatherForDisplay(weather)
    ).join('\n\n');

    return {
      description: `Travel weather advice for ${cities.join(', ')}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I'm planning to travel to these cities ${travelDate}. Please analyze the weather conditions and provide travel advice:\n\n${weatherTexts}\n\nPlease provide:\n- Best city for outdoor activities\n- Packing recommendations\n- Transportation considerations\n- Best times to visit each location\n- Any weather-related travel warnings`,
          },
        },
      ],
    };
  }

  async generateWeatherComparisonPrompt(args) {
    const city1 = args.city1 || 'London';
    const city2 = args.city2 || 'Paris';
    
    const [weather1, weather2] = await Promise.all([
      this.weatherService.getWeatherByCity(city1, 'metric'),
      this.weatherService.getWeatherByCity(city2, 'metric'),
    ]);

    const weather1Text = this.weatherService.formatWeatherForDisplay(weather1);
    const weather2Text = this.weatherService.formatWeatherForDisplay(weather2);

    return {
      description: `Weather comparison between ${city1} and ${city2}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please compare the weather conditions between these two cities and help me decide which has better conditions:\n\n**${city1}:**\n${weather1Text}\n\n**${city2}:**\n${weather2Text}\n\nProvide a detailed comparison including:\n- Temperature and comfort differences\n- Precipitation and visibility\n- Wind conditions\n- Overall weather quality\n- Recommendations for activities in each city`,
          },
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP stdio server started');
  }
}

const server = new WeatherMCPServer();
server.run().catch(console.error);