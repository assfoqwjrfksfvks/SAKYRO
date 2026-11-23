import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  ...(process.env.SAKYRO_STANDALONE === "1" && {
    output: "standalone",
    images: { unoptimized: true },
    outputFileTracingExcludes: {
      "/*": [
        "./.data/**/*",
      ],
    },
  }),
};

export default config;
