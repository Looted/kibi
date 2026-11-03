import { describe, expect, test } from "bun:test";
import { classifyMeaningfulChange } from "../src/meaningful-change-classifier";

function classify(
  normalizedPath: string,
  pathKind: Parameters<
    typeof classifyMeaningfulChange
  >[0]["pathKind"] = "unknown",
  riskClass?: Parameters<typeof classifyMeaningfulChange>[0]["riskClass"],
) {
  return classifyMeaningfulChange({
    normalizedPath,
    pathKind,
    lifecycle: "edited",
    riskClass,
  });
}

describe("classifyMeaningfulChange", () => {
  test.each([
    ".kb/branches",
    ".kb/branches/main/kb.rdf",
    "pkg/.kb/briefs/x.json",
    "pkg/.kb/migrations",
    ".kb/config.json",
    "pkg/.kb/config.json",
    "dist/a.js.map",
    "a.js.map",
    "tsconfig.tsbuildinfo",
  ])("%s is ignored", (file) => {
    expect(classify(file, "code", "behavior_candidate")).toBe("ignored");
  });

  test.each(["bun.lock", "pkg/bun.lock", "a/b/yarn.lock"])(
    "%s is an advisory lockfile",
    (file) => {
      expect(classify(file, "code", "behavior_candidate")).toBe("advisory");
    },
  );

  test("other files named like lockfiles are not advisory", () => {
    expect(classify("pkg/xbun.lock", "unknown")).toBe("requires-kb-evidence");
  });

  test("only safe docs on unknown paths are advisory", () => {
    expect(classify("docs/a.txt", "unknown", "safe_docs_only")).toBe(
      "advisory",
    );
    expect(classify("docs/a.txt", "code", "safe_docs_only")).toBe(
      "requires-kb-evidence",
    );
    expect(classify("docs/a.txt", "unknown", "behavior_candidate")).toBe(
      "requires-kb-evidence",
    );
    expect(classify("docs/a.txt", "unknown")).toBe("requires-kb-evidence");
  });
});
