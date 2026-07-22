import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.use(helmet());

  const corsOrigin = configService.get<string>("CORS_ORIGIN", "");
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(",").map((o) => o.trim()) : true,
  });

  if (configService.get<boolean>("TRUST_PROXY", false)) {
    app.set("trust proxy", 1);
  }

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (configService.get<boolean>("SWAGGER_ENABLED", true)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Ikaystores API")
      .setDescription("Multivendor e-commerce API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start Ikaystores API", error);
  process.exit(1);
});
