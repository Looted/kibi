import assert from "node:assert";
import { describe, it } from "node:test";
import { parseNpmPackJsonOutput } from "./npm-pack-json.js";

describe("opencode packed utility helpers", () => {
  it("parses npm pack JSON after build output noise", () => {
    const noisyOutput = `[build-tui] dist/tui.js written
[{"lifecycle":"contract verifier"}]
[
  {
    "filename": "kibi-opencode-0.4.1.tgz",
    "version": "0.4.1"
  }
]
`;

    const results = parseNpmPackJsonOutput(noisyOutput);

    assert.deepStrictEqual(results, [
      { filename: "kibi-opencode-0.4.1.tgz", version: "0.4.1" },
    ]);
  });
});
