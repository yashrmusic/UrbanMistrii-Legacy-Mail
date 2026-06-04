import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/portal/studio/",
  build: {
    emptyOutDir: true,
    outDir: "../../public/portal/studio"
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174
  }
});
