import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),

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
});
