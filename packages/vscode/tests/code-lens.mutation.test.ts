import { describe, expect, mock, test } from "bun:test";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());

const { KibiCodeLensProvider } = await import("../src/codeLensProvider");
const { RelationshipCache } = await import("../src/relationshipCache");

describe("relativeKey", () => {
  test("paths inside the workspace are normalized relative keys", () => {
    const root = path.resolve("/w/root");
    const provider = new KibiCodeLensProvider(root, new RelationshipCache());
    const internals = provider as unknown as {
      relativeKey(inputPath: string): string | null;
    };
    expect(internals.relativeKey(path.join(root, "a", "..", "b", "c.ts"))).toBe(
      path.join("b", "c.ts"),
    );
  });
});
