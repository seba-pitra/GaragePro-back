import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envConfiguration } from './config/env.config';

async function bootstrap() {
  const logger = new Logger('MAIN');

  const app = await NestFactory.create(AppModule);
  const { port } = envConfiguration();

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  logger.log(`App running on port ${port}`);
}
bootstrap();
