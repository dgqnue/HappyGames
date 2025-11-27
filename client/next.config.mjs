/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:5000/api/:path*',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://localhost:5000/socket.io/:path*', // Proxy socket.io
            }
        ];
    },
};

export default nextConfig;
