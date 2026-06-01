/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "https", hostname: "assets.1billionpixel.fun" },
    ],
  },
  serverExternalPackages: ['sharp'],
  allowedDevOrigins: ['yeast-kirk-flux-spokesman.trycloudflare.com'],
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