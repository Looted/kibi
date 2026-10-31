import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLUGIN_LANGUAGE_PACKS } from "../../src/operations/proof/code-languages.js";
import {
  describeReferenceLanguageSuggestion,
  referenceLanguageSuggestion,
} from "../../src/plugins/reference-language-suggestion.js";

const active = {
  plugins: [
    {
      package: "kibi-plugin-treesitter",
      capabilities: {
        "kibi.symbol-extractor.v2": { mode: "augment" as const },
        "kibi.reference-extractor.v1": { mode: "augment" as const },
      },
    },
  ],
};
const pinned = new Map([
  ["kibi-lang-go", "1.0.0"],
  ["kibi-lang-php", "1.0.0"],
]);

// executable_for TEST-kibi-tree-sitter-language-packs
describe("language pack suggestions", () => {
  it("names a pack the tracked sources need when it is missing or not the pinned version", () => {
    const files = ["cmd/main.go", "web/index.php", "cmd/main_test.go"];
    const missing = referenceLanguageSuggestion(
      files,
      active,
      () => null,
      pinned,
    );
    if (missing === null) throw new Error("expected a suggestion");
    expect(missing.capabilities).toEqual([]);
    expect(missing.packs).toEqual([
      "kibi-lang-go@1.0.0",
      "kibi-lang-php@1.0.0",
    ]);
    expect(describeReferenceLanguageSuggestion(missing)).toBe(
      "1 Go, 1 PHP source file(s); kibi-plugin-treesitter reads them only with the grammar pack(s) kibi-lang-go@1.0.0, kibi-lang-php@1.0.0 installed: npm install --save-dev kibi-lang-go@1.0.0 kibi-lang-php@1.0.0",
    );

    const stale = referenceLanguageSuggestion(
      files,
      active,
      (name) => (name === "kibi-lang-go" ? "0.9.0" : "1.0.0"),
      pinned,
    );
    expect(stale?.packs).toEqual(["kibi-lang-go@1.0.0"]);

    expect(
      referenceLanguageSuggestion(files, active, () => "1.0.0", pinned),
    ).toBeNull();
  });

  it("does not push the plugin for languages it cannot prove when it is not listed", () => {
    expect(
      referenceLanguageSuggestion(["web/index.php", "deploy.sh"], {}),
    ).toBeNull();
    expect(
      referenceLanguageSuggestion(["cmd/main.go"], {
        declinedPlugins: ["kibi-plugin-treesitter"],
      }),
    ).toBeNull();
  });

  it("maps every pack-hosted catalog extension to its pack", () => {
    const catalog = JSON.parse(
      readFileSync(
        join(import.meta.dir, "../../../plugin-treesitter/catalog.json"),
        "utf8",
      ),
    ) as {
      languages: { id: string; extensions: string[]; pack?: string }[];
    };
    const packed = catalog.languages.filter((language) => language.pack);
    expect(new Set(packed.map((language) => language.pack))).toEqual(
      new Set(PLUGIN_LANGUAGE_PACKS.map((entry) => entry.pack)),
    );
    for (const language of packed)
      for (const extension of language.extensions)
        expect(
          PLUGIN_LANGUAGE_PACKS.find((entry) =>
            entry.pattern.test(`src/file${extension}`),
          )?.pack as string | undefined,
        ).toBe(language.pack);
  });
});
