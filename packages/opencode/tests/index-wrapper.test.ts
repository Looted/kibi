import { describe, expect, test } from "bun:test";

describe("index wrapper", () => {
  test("re-exports the plugin implementation from plugin.ts", async () => {
    const wrapper = await import("../src/index");
    const pluginModule = await import("../src/plugin");

    expect(wrapper.default.server).toBe(pluginModule.default);
    expect(wrapper.default.id).toBe("kibi-opencode");
    expect(typeof wrapper.default.setup).toBe("function");
  });
});
