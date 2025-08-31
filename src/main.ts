import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Weather MCP Server is running on: http://localhost:${port}`);
  logger.log(`MCP endpoint: http://localhost:${port}/mcp`);
}

bootstrap();