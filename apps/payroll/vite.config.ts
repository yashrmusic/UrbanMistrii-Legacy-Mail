import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/portal/payroll/",
  build: {
    emptyOutDir: true,
    outDir: "../../public/portal/payroll"
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
