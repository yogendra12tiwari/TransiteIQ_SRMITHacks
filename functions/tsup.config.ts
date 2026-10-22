import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["esm"],
  target: "node22",
  clean: true,
  bundle: true,
  noExternal: ["@transitiq/shared"],
  sourcemap: true,
});
