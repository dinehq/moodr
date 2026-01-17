/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@vercel/blob"],
  },
  async rewrites() {
    return [
      {
        source: "/projects/demo",
        destination: "/projects/HAHMqi4XZrvTUa58",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/projects/kWDY1tP2ZdlR4yqe",
        destination: "/projects/demo",
        permanent: true,
      },
      {
        source: "/projects/aVWSDJiykWE8aRzT",
        destination: "/projects/demo",
        permanent: true,
      },
      {
        source: "/projects/Ypbvf-MnPW1QiEIu",
        destination: "/projects/demo",
        permanent: true,
      },
      {
        source: "/projects/QvBuUadUJ0c4TAss",
        destination: "/projects/demo",
        permanent: true,
      },
      {
        source: "/projects/KqvuN4NZ_ooFr71K",
        destination: "/projects/demo",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
