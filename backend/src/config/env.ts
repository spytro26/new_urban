import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  PORT: process.env.PORT || "3000",

  JWT_USER_SECRET: requireEnv("JWT_USER_SECRET"),
  JWT_ADMIN_SECRET: requireEnv("JWT_ADMIN_SECRET"),
  JWT_AGENT_SECRET: requireEnv("JWT_AGENT_SECRET"),

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),
};
