/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.API_URL || 'http://localhost:5000'}/api/:path*`,
            },
            {
                source: '/socket.io/:path*',
                destination: `${process.env.API_URL || 'http://localhost:5000'}/socket.io/:path*`,
            }
        ];
    },
};

export default nextConfig;
