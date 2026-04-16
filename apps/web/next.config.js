/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
   // remotePatterns: [{ protocol: "https", hostname: "assets.1billionpixel.fun" }],
  remotePatterns: [{ protocol: "http", hostname: "localhost", port: "4000" }],  
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;