import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        ignored: ["**/node_modules", "**/.git", "**/.next"],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.google.com https://www.gstatic.com",
              "worker-src 'self'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https://*.supabase.co data: blob:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.google.com wss://*.firebaseio.com https://*.firebase.com https://*.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://*.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
