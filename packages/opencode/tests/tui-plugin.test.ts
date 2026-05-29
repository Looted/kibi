import { describe, expect, test } from "bun:test";
import { tui } from "../src/tui";

describe("tui plugin", () => {
  test("does not register brief routes or command aliases", async () => {
    const routes: Array<{ name: string }> = [];
    const commands: Array<{ value: string }> = [];
    const api = {
      route: {
        register: (defs: Array<{ name: string }>) => routes.push(...defs),
        navigate: () => {},
      },
      command: {
        register: (factory: () => Array<{ value: string }>) =>
          commands.push(...factory()),
      },
      state: { path: { worktree: "" }, vcs: { branch: "main" } },
      theme: { current: { error: "red", accent: "blue", warning: "yellow" } },
    };

    await tui(api as never, {}, {} as never);

    expect(routes.some((route) => route.name === "kibi.brief")).toBe(false);
    expect(
      commands.some((command) => command.value === "kibi.open_latest_brief"),
    ).toBe(false);
    expect(
      commands.some((command) => command.value === "kibi.refresh_brief"),
    ).toBe(false);
    expect(commands.some((command) => command.value === "kibi-brief")).toBe(
      false,
    );
    expect(commands.some((command) => command.value === "/brief-kibi")).toBe(
      false,
    );
  });
});
