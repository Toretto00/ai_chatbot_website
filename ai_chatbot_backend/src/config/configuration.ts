export default () => ({
  port: parseInt(process.env.PORT ?? '', 10) || 8080,
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  database: {
    url: process.env.DB_URL ?? '',
    port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
    username: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? '',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    accessTokenExpried:
      parseInt(process.env.JWT_ACCESS_TOKEN_EXPRIED ?? '', 10) || 3600,
  },
});
