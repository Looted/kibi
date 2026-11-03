import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { readMcpPackageVersion } from "../src/diagnostics.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const PACKAGE_JSON = path.join(import.meta.dir, "..", "package.json");

describe("readMcpPackageVersion", () => {
  test("reads the version of the nearest package.json", () => {
    const expected = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")).version;
    expect(readMcpPackageVersion()).toBe(expected);
  });

  test("a package.json without a text version gives null", () => {
    for (const body of ['{"version":1}', "[]", "null", "{}", "not json"]) {
      const read = spyOn(fs, "readFileSync").mockImplementation(
        () => body as never,
      );
      try {
        expect(readMcpPackageVersion()).toBeNull();
        expect(read).toHaveBeenCalledWith(PACKAGE_JSON, "utf8");
      } finally {
        read.mockRestore();
      }
    }
  });

  test("no package.json up to the root gives null", () => {
    const seen: string[] = [];
    spies.push(
      spyOn(fs, "existsSync").mockImplementation((candidate) => {
        seen.push(String(candidate));
        return false;
      }),
    );
    expect(readMcpPackageVersion()).toBeNull();
    expect(seen[0]).toBe(
      path.join(import.meta.dir, "..", "src", "package.json"),
    );
    expect(seen.at(-1)).toBe(
      path.join(path.parse(seen[0] ?? "").root, "package.json"),
    );
  });
});
