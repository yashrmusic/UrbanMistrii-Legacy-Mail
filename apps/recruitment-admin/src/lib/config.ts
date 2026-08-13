import type { PortalConfig } from "../types";

export const loadPortalConfig = async (): Promise<PortalConfig> => {
  try {
    const response = await fetch("/portal-config.json", { cache: "no-store" });
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
};

export const hasSupabaseConfig = (config: PortalConfig | null | undefined) =>
  Boolean(config?.provider === "supabase" && config.supabaseUrl && config.supabaseAnonKey);
