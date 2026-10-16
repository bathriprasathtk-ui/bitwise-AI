import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loudly at boot rather than deep inside a request handler.
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  aiProvider: (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "openai",
  aiApiKey: required("AI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};
