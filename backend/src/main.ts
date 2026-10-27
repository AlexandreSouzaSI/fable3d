import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Content-Disposition exposto para o front ler o nome do arquivo do PDF.
  app.enableCors({ exposedHeaders: ['Content-Disposition'] });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
