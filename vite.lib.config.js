import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./lib"),
    },
  },

  plugins: [],

  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "lib/index.ts"),
      name: "GraphQLDevKit",
      fileName: (format) => `lib.${format}.js`,
    },

    rollupOptions: {
      external: ["graphql", "zod"],
      output: {
        globals: {
          graphql: "graphql",
          zod: "zod",
        },
      },
    },
  },
})
