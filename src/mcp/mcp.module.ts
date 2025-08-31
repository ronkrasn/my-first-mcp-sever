import { Module } from '@nestjs/common';
import { MCPController } from './mcp.controller';
import { MCPService } from './mcp.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  controllers: [MCPController],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}