import * as Joi from 'joi';

export const joiValidationSchema = Joi.object({
  NODE_ENV: Joi.required().valid('development', 'test', 'production').default('development'),
  PORT: Joi.required().default(3000),
  DB_HOST: Joi.required().default('postgres'),
  DB_USER: Joi.required().default('postgres'),
  DB_PASSWORD: Joi.required(),
  DB_NAME: Joi.required().default('development'),
  DB_PORT: Joi.required().default(5432),
  JWT_TOKEN_SECRET: Joi.required(),
});
