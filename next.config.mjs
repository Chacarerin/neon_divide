/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimizations for game performance
    reactStrictMode: false, // Avoid double-rendering in dev (important for Canvas)

    // Image optimization
    images: {
        domains: [],
    },
}

export default nextConfig
