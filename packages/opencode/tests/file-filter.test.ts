import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import { shouldHandleFile } from "../src/file-filter";

// implements REQ-opencode-kibi-plugin-v1

describe("file-filter shouldHandleFile", () => {
  it("matches documentation markdown under configured directories", () => {
    const ok = shouldHandleFile(
      "documentation/requirements/REQ-001.md",
      process.cwd(),
    );
    assert.equal(ok, true);
  });

  it("ignores node_modules files", () => {
    const ok = shouldHandleFile(
      "node_modules/something/index.js",
      process.cwd(),
    );
    assert.equal(ok, false);
  });

  it("matches symbols manifest path", () => {
    const ok = shouldHandleFile("documentation/symbols.yaml", process.cwd());
    assert.equal(ok, true);
  });

  it("does not match unrelated src files", () => {
    const ok = shouldHandleFile("src/app/main.ts", process.cwd());
    assert.equal(ok, false);
  });
});
