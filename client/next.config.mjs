/** @type {import('next').NextConfig} */
const nextConfig = {
    // Rewrites don't work with runtime env vars on Vercel
    // We'll use NEXT_PUBLIC_API_URL directly in client code instead
};

export default nextConfig;
