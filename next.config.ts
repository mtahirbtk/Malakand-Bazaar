import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Listing/seller photos are served from Cloudinary (see
    // src/server/storage.ts) — a fixed host, unlike the old Supabase Storage
    // pattern, which had to be derived from the project's own URL.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
};

export default withNextIntl(nextConfig);
