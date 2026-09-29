import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.API_PORT ?? 4000),
  apiToken: req("API_TOKEN"),
  spApi: {
    clientId: req("SP_API_CLIENT_ID"),
    clientSecret: req("SP_API_CLIENT_SECRET"),
    refreshToken: req("SP_API_REFRESH_TOKEN"),
    sellerId: req("SP_API_SELLER_ID"),
    endpoint: process.env.SP_API_ENDPOINT,
  },
};
