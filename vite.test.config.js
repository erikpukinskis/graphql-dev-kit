import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {
    exclude: ["./node_modules/**", "./.yarn/**", "./dist/**"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./lib"),
    },
  },

  plugins: [],

  build: {
    rollupOptions: {},
  },
})
