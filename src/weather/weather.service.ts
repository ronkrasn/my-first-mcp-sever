import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WeatherData, OpenWeatherMapResponse } from './weather.types';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY') || 'demo-key';
    
    if (this.apiKey === 'demo-key') {
      this.logger.warn('Using demo API key. Set OPENWEATHER_API_KEY environment variable for production use.');
    }
  }

  async getWeatherByCity(city: string, units: 'metric' | 'imperial' = 'metric'): Promise<WeatherData> {
    this.logger.log(`Fetching weather for city: ${city} with units: ${units}`);

    if (!city || city.trim().length === 0) {
      throw new BadRequestException('City name is required');
    }

    // If using demo key, return mock data
    if (this.apiKey === 'demo-key') {
      return this.getMockWeatherData(city, units);
    }

    try {
      const response = await axios.get<OpenWeatherMapResponse>(this.baseUrl, {
        params: {
          q: city,
          appid: this.apiKey,
          units: units,
        },
        timeout: 10000,
      });

      return this.transformWeatherData(response.data, units);
    } catch (error) {
      this.logger.error(`Error fetching weather data: ${error.message}`, error.stack);
      
      if (error.response?.status === 404) {
        throw new BadRequestException(`City "${city}" not found`);
      }
      
      if (error.response?.status === 401) {
        throw new BadRequestException('Invalid API key');
      }

      throw new BadRequestException('Failed to fetch weather data');
    }
  }

  private transformWeatherData(data: OpenWeatherMapResponse, units: 'metric' | 'imperial'): WeatherData {
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

  private getMockWeatherData(city: string, units: 'metric' | 'imperial'): WeatherData {
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

  formatWeatherForDisplay(weather: WeatherData): string {
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