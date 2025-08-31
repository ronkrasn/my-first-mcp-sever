import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MCPModule } from './mcp/mcp.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MCPModule,
    WeatherModule,
  ],
})
export class AppModule {}