/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@napi-rs/canvas', 'pdfjs-dist'],
    outputFileTracingIncludes: {
      '/api/parse-pdf': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
