import type { KibiPluginV1 } from "./protocol.js";

/**
 * Ergonomic helper that preserves the plugin object as a typed constant.
 */
export function defineKibiPlugin<T extends KibiPluginV1>(plugin: T): T {
  return plugin;
}
