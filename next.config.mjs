/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate output folder for verification builds, so they never clash with a running `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Datasets are read from ./data on the server only; they are never placed in /public.
  outputFileTracingIncludes: { "/api/**": ["./data/datasets/*.json"] },
};
export default nextConfig;
