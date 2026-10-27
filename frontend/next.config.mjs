import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The repo root has its own package-lock.json (database scripts), so tell Next.js
// that frontend/ is the app root.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    turbopack: { root: appRoot },
    outputFileTracingRoot: appRoot
};

export default nextConfig;
