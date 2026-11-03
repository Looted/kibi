import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { refreshManifestCoordinates } from "../../src/commands/sync/manifest.js";

afterEach(() => {
  mock.restore();
});

describe("refreshManifestCoordinates failure reporting", () => {
  test("lists ten failed symbols and summarizes the rest", async () => {
    const symbols = Array.from({ length: 12 }, (_, index) => ({
      id: `SYM-${String(index).padStart(2, "0")}`,
      title: `fn${index}`,
      sourceFile: "src/gone.go",
    }));
    const logs: string[] = [];
    spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    await refreshManifestCoordinates("/ws/.kb/symbols.yaml", "/ws", {
      readFileSync: (() => "raw") as never,
      parseYAML: () => ({ symbols }),
      dumpYAML: () => "raw",
      existsSync: () => false,
      writeFileSync: () => undefined,
      renameSync: () => undefined,
      unlinkSync: () => undefined,
      enrichSymbolCoordinates: async (entries) =>
        entries.map((entry) => ({
          ...entry,
          coordinateRefreshFailure: "src/gone.go does not exist",
        })),
      writeCoordinateArtifact: () => "",
      resolveSymbolsManifestPaths: (() => ({ coordinatesPath: null })) as never,
    });
    const failed = logs.filter((line) => line.startsWith("  failed "));
    expect(failed).toHaveLength(10);
    expect(logs).toContain("  ... and 2 more failed symbol(s)");
  });
});
