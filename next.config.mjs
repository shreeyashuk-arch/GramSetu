import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Replace any realpath C:/GramSetu_modules with virtual junction E:/GramSetu
    const originalEntry = config.entry;
    config.entry = async () => {
      const entries = await originalEntry();
      const normalize = (val) => {
        if (typeof val === 'string') {
          return val.replace(/^[./]*C:[/\\]GramSetu_modules[/\\]node_modules/i, path.resolve(process.cwd(), 'node_modules'));
        }
        if (Array.isArray(val)) {
          return val.map(normalize);
        }
        if (val && typeof val === 'object') {
          const res = {};
          for (const k in val) {
            res[k] = normalize(val[k]);
          }
          return res;
        }
        return val;
      };
      return normalize(entries);
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      'next': path.resolve(process.cwd(), 'node_modules/next'),
    };

    return config;
  },
};

export default nextConfig;
