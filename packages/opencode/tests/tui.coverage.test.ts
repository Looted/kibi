// implements REQ-opencode-kibi-plugin-v1
import { describe, expect, test } from "bun:test";
import plugin, { tui } from "../src/tui.tsx";

describe("opencode TUI plugin stub", () => {
  test("exports the plugin id and a no-op tui hook", async () => {
    expect(plugin.id).toBe("kibi-opencode");
    await tui({} as never, {}, {});
    expect(typeof plugin.tui).toBe("function");
  });
});
