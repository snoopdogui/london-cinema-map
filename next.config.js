/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/api/showtimes",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=21600, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/api/booking",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
