import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// HTTP Security Headers (Phase 10 — Security Hardening)
// Applied to every page and API route via Next.js headers() config.
// ---------------------------------------------------------------------------
const securityHeaders = [
  // Prevent MIME-type sniffing (e.g. serving .js as text/html)
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Block the page from being embedded in iframes (clickjacking protection)
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Only send the origin, never the full Referrer URL to third parties
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable dangerous browser features we never use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  // Enforce HTTPS for 1 year on all sub-domains (enables preloading when ready)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content-Security-Policy
  // - default-src 'self'                 → block everything unknown by default
  // - script-src 'self' 'unsafe-inline'  → Next.js inline scripts; tighten with nonces in future
  // - style-src 'self' 'unsafe-inline' fonts.googleapis.com → Tailwind + Google Fonts
  // - img-src ... res.cloudinary.com     → ad images from Cloudinary
  // - connect-src ... mistral/gemini     → AI APIs
  // - font-src ... fonts.gstatic.com     → Google Fonts CDN
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://via.placeholder.com https://images.unsplash.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.mistral.ai https://generativelanguage.googleapis.com https://res.cloudinary.com wss:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
