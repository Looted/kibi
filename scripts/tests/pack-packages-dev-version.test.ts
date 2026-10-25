// implements REQ-020
import { describe, expect, test } from "bun:test";
import { stampDevVersion } from "../pack-packages";

describe("pack-packages --dev-version", () => {
  test("stamps the version and pins packed siblings to their dev versions", () => {
    const stamped = new Map([
      ["kibi-cli", "2.31.1-dev.abc123"],
      ["kibi-core", "0.23.0-dev.abc123"],
    ]);
    const next = stampDevVersion(
      {
        name: "kibi-cli",
        version: "2.31.1",
        dependencies: { "kibi-core": "^0.23.0", yaml: "^2.9.1" },
        optionalDependencies: { "kibi-plugin-jev": "^1.0.0" },
      },
      stamped,
    );
    expect(next.version).toBe("2.31.1-dev.abc123");
    expect(next.dependencies).toEqual({
      "kibi-core": "0.23.0-dev.abc123",
      yaml: "^2.9.1",
    });
    expect(next.optionalDependencies).toEqual({ "kibi-plugin-jev": "^1.0.0" });
  });
});
