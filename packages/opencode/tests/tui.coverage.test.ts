// implements REQ-opencode-kibi-plugin-v1
import { describe, expect, test } from "bun:test";
import plugin, { tui } from "../src/tui.js";

describe("opencode TUI plugin stub", () => {
  test("exports the plugin id and a no-op tui hook", async () => {
    expect(plugin.id).toBe("kibi-opencode");
    await tui({} as never, {} as never, {} as never);
    expect(typeof plugin.tui).toBe("function");
  });
});
