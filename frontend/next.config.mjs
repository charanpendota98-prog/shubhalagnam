/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server build lo lint/type errors valla build fail avvakudadu
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

  // R14 FIX: /remarriage పాత client-side hack (component render + JS router.replace)
  // తీసేసి config-level 308 permanent redirect పెట్టాం — ఇది edge/server layer లోనే
  // నిజమైన HTTP redirect header పంపుతుంది (curl/crawlers/browsers అందరికీ ఒకేలా పనిచేస్తుంది).
  async redirects() {
    return [
      { source: '/remarriage', destination: '/second-marriage', permanent: true },
    ];
  },

  async headers() {
    // 🛡️ R11: production lo SAMEORIGIN (clickjacking block — matrimony site ki must).
    // Dev/preview lo ALLOWALL (sandbox iframe preview kavali).
    const isProd = process.env.NODE_ENV === 'production';
    // 🛡️ P1 security fix: Content-Security-Policy was completely missing.
    // Allowlist built from an actual audit of this app's external resource
    // usage (not a generic template): Razorpay is the only third-party
    // script/frame this app loads (`PayBox.tsx` injects
    // checkout.razorpay.com at runtime for the payment widget); there is no
    // next/image remote-domain usage, no Google Fonts/Analytics/GTM, and the
    // two `dangerouslySetInnerHTML` call sites are both JSON-LD
    // (`application/ld+json`) structured-data blocks, not script execution.
    // `'unsafe-inline'` is kept for script/style because this app has no
    // nonce-based CSP plumbing yet (Next.js's own hydration bootstrap +
    // several inline `<style>`/`<script type="application/ld+json">` blocks
    // need it) — a nonce-based upgrade is a larger, separately-justified
    // follow-up (see SECURITY_AUDIT.md), not bundled into this pass to avoid
    // risking a silent breakage across 40+ pages. Only applied in production
    // — left off in dev so Turbopack HMR (inline eval, websocket) and the
    // Arena sandbox iframe preview are unaffected.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ');
    const base = isProd
      ? [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ]
      : [{ key: 'X-Frame-Options', value: 'ALLOWALL' }];
    return [
      { source: '/(.*)', headers: base },
    ];
  },
};

export default nextConfig;
