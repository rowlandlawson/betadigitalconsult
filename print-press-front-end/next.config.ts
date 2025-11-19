import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const uploadsBase =
  process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || deriveUploadsBase(apiBase);

const uploadsUrl = new URL(uploadsBase);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: uploadsUrl.protocol.replace(":", "") as "http" | "https",
        hostname: uploadsUrl.hostname,
        port: uploadsUrl.port || undefined,
        pathname: "/uploads/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${uploadsBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

function deriveUploadsBase(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    if (url.pathname.endsWith("/api")) {
      url.pathname = url.pathname.replace(/\/api$/, "");
    }
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return "http://localhost:5000";
  }
}
