import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, ".."),
    output: "export",             
    images: { unoptimized: true },
};

export default nextConfig;
