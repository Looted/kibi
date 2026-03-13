// implements REQ-opencode-kibi-plugin-v1
export interface KibiConfig {
  enabled?: boolean;
  syncDebounceMs?: number;
}

export const defaultConfig: KibiConfig = {
  enabled: true,
  syncDebounceMs: 2500,
};

export function loadConfig(): KibiConfig {
  return defaultConfig;
}
