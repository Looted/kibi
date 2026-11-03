import { describe, expect, test } from "bun:test";
import { knownVersions, notifyStartup } from "../src/startup-notifier";

describe("notifyStartup", () => {
  test("a rejected log write stays silent", async () => {
    const bodies: unknown[] = [];
    notifyStartup(
      {
        app: {
          log: async ({ body }: { body: unknown }) => {
            bodies.push(body);
            throw new Error("log down");
          },
        },
      } as never,
      { suppressToast: true },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
      },
    ]);
  });
});

describe("knownVersions", () => {
  test("keeps only the known versions in package order", () => {
    const result = knownVersions({
      opencode: "1.0.0",
      mcp: "unknown",
      cli: "2.0.0",
      core: "unknown",
    });
    expect(result).toStrictEqual({
      versions: { opencode: "1.0.0", cli: "2.0.0" },
    });
    expect(Object.keys(result.versions ?? {})).toEqual(["opencode", "cli"]);
  });

  test("omits the versions entry when none is known", () => {
    expect(
      knownVersions({
        opencode: "unknown",
        mcp: "unknown",
        cli: "unknown",
        core: "unknown",
      }),
    ).toStrictEqual({});
  });

  test("keeps every version when all are known", () => {
    expect(
      knownVersions({ opencode: "a", mcp: "b", cli: "c", core: "d" }),
    ).toStrictEqual({
      versions: { opencode: "a", mcp: "b", cli: "c", core: "d" },
    });
  });
});
