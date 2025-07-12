/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"]
    }
  },
}

module.exports = nextConfig 