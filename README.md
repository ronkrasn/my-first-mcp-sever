# NestJS Weather MCP Server

A Model Context Protocol (MCP) server built with NestJS that provides weather information by city. This server can be used with MCP-compatible clients like Claude Desktop to retrieve current weather data.

## Features

- **MCP Protocol Compliance**: Full implementation of the Model Context Protocol specification
- **Weather Data**: Current weather information for any city worldwide
- **Multiple Units**: Support for both metric (Celsius) and imperial (Fahrenheit) units
- **OpenWeatherMap Integration**: Uses OpenWeatherMap API for reliable weather data
- **Demo Mode**: Works with mock data when no API key is provided
- **Error Handling**: Comprehensive error handling and validation

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment** (optional for demo mode):
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenWeatherMap API key
   ```

3. **Start the server**:
   ```bash
   npm run start:dev
   ```

4. **Test the server**:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}'
   ```

## MCP Tool Usage

The server provides one MCP tool:

### get-weather

Get current weather information for a city.

**Parameters**:
- `city` (required): Name of the city
- `units` (optional): `"metric"` or `"imperial"` (defaults to metric)

**Example MCP call**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get-weather",
    "arguments": {
      "city": "London",
      "units": "metric"
    }
  }
}
```

## Configuration

### Environment Variables

- `OPENWEATHER_API_KEY`: Your OpenWeatherMap API key (get one at https://openweathermap.org/api)
- `PORT`: Server port (defaults to 3000)

### Getting an API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

## Development Commands

- `npm run start:dev` - Start in development mode with hot reload
- `npm run start` - Start in production mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## MCP Integration

This server can be integrated with MCP-compatible clients. For Claude Desktop:

1. Add this server to your MCP configuration
2. The server will expose the `get-weather` tool
3. You can ask Claude to get weather information for any city

## API Endpoints

- `POST /mcp` - Main MCP endpoint for all protocol communication

## License

MIT