import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.1.142', 'localhost', 'graded.local', 'graded.school', 'graded'],
};

export default nextConfig;
