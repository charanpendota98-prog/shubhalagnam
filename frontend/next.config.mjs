/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type checking is run separately in CI; keep production builds resilient to generated API types.
  typescript: { ignoreBuildErrors: true },

  // /api/* ni backend ki proxy — browser localhost ni touch cheyyadu (CORS + docker friendly)
  // Docker: BACKEND_URL=http://backend:8000 · Local/sandbox: http://localhost:8000
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/docs', destination: `${backend}/docs` },
      { source: '/openapi.json', destination: `${backend}/openapi.json` },
      { source: '/cards/:path*', destination: `${backend}/cards/:path*` },
      { source: '/photos/:path*', destination: `${backend}/photos/:path*` },
      { source: '/voice/:path*', destination: `${backend}/voice/:path*` },
    ];
  },

  async headers() {
    // 🛡️ R11: production lo SAMEORIGIN (clickjacking block — matrimony site ki must).
    // Dev/preview lo ALLOWALL (sandbox iframe preview kavali).
    const isProd = process.env.NODE_ENV === 'production';
    const base = isProd
      ? [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ]
      : [{ key: 'X-Frame-Options', value: 'ALLOWALL' }];
    return [
      { source: '/(.*)', headers: base },
    ];
  },
};

export default nextConfig;
