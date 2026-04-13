import { defineConfig } from "tsup";

export default defineConfig([
  // CLI binary
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: true,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  // Library entry (for programmatic use by batch runner, etc.)
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    sourcemap: true,
  },
]);
