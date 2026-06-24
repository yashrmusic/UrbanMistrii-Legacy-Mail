import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/admin/",
  build: {
    emptyOutDir: true,
    outDir: "../../public/admin"
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5175
  }
});
