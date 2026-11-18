/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Datasets are read from ./data on the server only; they are never placed in /public.
  outputFileTracingIncludes: { "/api/**": ["./data/datasets/*.json"] },
};
export default nextConfig;
