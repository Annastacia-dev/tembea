/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Turbopack rooted in this project (a stray lockfile in the home folder otherwise confuses it).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
