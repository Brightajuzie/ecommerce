import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgresql", "postgres"] })
    .required(),

  // Comma-separated list of allowed origins for browser clients (e.g. a web
  // admin dashboard). Leave unset in development to allow any origin; set
  // explicitly in production. The mobile app itself isn't a browser origin
  // and is unaffected either way.
  CORS_ORIGIN: Joi.string().allow("").default(""),
  // Set to true only when the API sits behind a reverse proxy/load balancer
  // that sets X-Forwarded-* headers — affects client IP detection used by
  // rate limiting and request logging.
  TRUST_PROXY: Joi.boolean().default(false),
  SWAGGER_ENABLED: Joi.boolean().default(true),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),

  FLW_PUBLIC_KEY: Joi.string().allow("").default(""),
  FLW_SECRET_KEY: Joi.string().allow("").default(""),
  FLW_ENCRYPTION_KEY: Joi.string().allow("").default(""),
  FLW_WEBHOOK_HASH: Joi.string().allow("").default(""),

  OPAY_MERCHANT_ID: Joi.string().allow("").default(""),
  OPAY_PUBLIC_KEY: Joi.string().allow("").default(""),
  OPAY_SECRET_KEY: Joi.string().allow("").default(""),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow("").default(""),
  CLOUDINARY_API_KEY: Joi.string().allow("").default(""),
  CLOUDINARY_API_SECRET: Joi.string().allow("").default(""),

  SMILE_ID_PARTNER_ID: Joi.string().allow("").default(""),
  SMILE_ID_API_KEY: Joi.string().allow("").default(""),
  SMILE_ID_ENVIRONMENT: Joi.string()
    .valid("sandbox", "production")
    .default("sandbox"),
});
