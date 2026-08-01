import type { NextConfig } from "next";

/* Security headers — the equivalent of Helmet in an Express app.
   Next has no middleware for this by default, so they're declared here
   and applied to every response. */
const securityHeaders = [
  /* Stop the browser guessing content types (MIME sniffing attacks). */
  { key: "X-Content-Type-Options", value: "nosniff" },

  /* Refuse to be embedded in a frame — blocks clickjacking, where an
     attacker overlays an invisible copy of your site over their own. */
  { key: "X-Frame-Options", value: "DENY" },

  /* Don't leak the full URL (which can contain ids) to other sites. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  /* Nothing here needs a camera, microphone, or location. */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  /* Force HTTPS for two years, including subdomains. */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  /* Content Security Policy.
     'unsafe-inline' and 'unsafe-eval' on scripts are required by Next's
     hydration and dev tooling; everything else is locked to self plus
     the specific hosts actually used. */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.brevo.com https://api.resend.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
