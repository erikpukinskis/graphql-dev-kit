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
      entry: path.resolve(__dirname, "lib/test.ts"),
      name: "GraphQLDevKitTest",
      fileName: (format) => `test.${format}.js`,
    },

    rollupOptions: {
      external: [
        "@graphql-typed-document-node/core",
        "graphql",
        "http",
        "light-my-request",
        "msw",
        "supertest",
        "zod",
      ],
      output: {
        globals: {
          "@graphql-typed-document-node/core": "graphqltypeddocumentnode",
          graphql: "graphql",
          http: "http",
          "light-my-request": "lightmyrequest",
          msw: "msw",
          supertest: "supertest",
          zod: "zod",
        },
      },
    },
  },
})
