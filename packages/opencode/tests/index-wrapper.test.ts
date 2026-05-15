import { describe, expect, test } from "bun:test";

describe("index wrapper", () => {
  test("re-exports the plugin implementation from plugin.ts", async () => {
    const wrapper = await import("../src/index");
    const pluginModule = await import("../src/plugin");

    expect(wrapper.default).toBe(pluginModule.default);
  });
});
