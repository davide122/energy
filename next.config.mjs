/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  generateStaticParams: false,
  dynamicParams: true
}

export default nextConfig;
