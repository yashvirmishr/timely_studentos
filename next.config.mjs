/** @type {import('next').NextConfig} */

/**
 * Content Security Policy
 * 
 * Built from the actual external dependencies in the codebase:
 * - Google Fonts (fonts.googleapis.com / fonts.gstatic.com)
 * - Supabase (*.supabase.co for API + WebSocket Realtime)
 * - Gemini AI (generativelanguage.googleapis.com)
 * - Google Classroom (classroom.googleapis.com)
 * - Google Calendar (www.googleapis.com)
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // 'unsafe-eval' needed for React dev mode (callstack reconstruction)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // React requires 'unsafe-inline' for style attribute hydration
  // Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts served from fonts.gstatic.com
  "font-src 'self' https://fonts.gstatic.com",
  // API connections to Google and Supabase
  // Supabase Realtime uses WebSockets (wss://)
  "connect-src 'self' https://generativelanguage.googleapis.com https://classroom.googleapis.com https://www.googleapis.com https://*.supabase.co wss://*.supabase.co",
  // Local images, base64 data URIs for embedded content
  "img-src 'self' data: blob:",
  // No iframes allowed
  "frame-src 'none'",
  // No plugins (Flash, Java, etc.)
  "object-src 'none'",
  // Prevent <base> tag injection
  "base-uri 'self'",
  // Forms can only submit to same origin
  "form-action 'self'",
  // Equivalent to X-Frame-Options: DENY (defense-in-depth)
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  images: { unoptimized: true },
  // Next.js 16.3 + Vercel bug (#96646): `output: 'standalone'` breaks Vercel's
  // onBuildComplete packaging (ENOENT .next/next-server.js.nft.json). Only
  // enable standalone for self-hosted/Docker builds, not on Vercel.
  output: process.env.VERCEL ? undefined : 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: CSP_DIRECTIVES,
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ],
};

export default nextConfig;