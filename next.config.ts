import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd(), '..', '..'), // points to repo root
  },
};

export default nextConfig;