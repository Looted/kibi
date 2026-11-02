// executable_for TEST-kibi-tree-sitter-references
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReferenceExtractorV1 } from "kibi-plugin-sdk";
import ts from "typescript";
import {
  evaluateSourceCode,
  extractScriptReferences,
} from "../../src/operations/proof/source-code-readers.js";
import { proofReferenceExtractorLoader } from "../../src/plugins/proof-reference-extractors.js";
import { type SourceSpec, readSource } from "../../src/public/proof-sources.js";

const roots: string[] = [];
const originalLoad = proofReferenceExtractorLoader.load;
afterEach(() => {
  proofReferenceExtractorLoader.load = originalLoad;
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-readers-m-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), content);
  }
  return root;
}

/** A provider for Terraform and Go files that lists `uses(name)`. */
function useExtractor(
  onExtract: (file: string) => void = () => {},
): ReferenceExtractorV1 {
  return {
    id: "test.references",
    supports: ({ path: file }) => /\.(?:tf|hcl|go)$/.test(file),
    extract: ({ path: file, content }) => {
      onExtract(file);
      return {
        contractVersion: "kibi.reference-extractor.v1",
        status: "ok",
        language: "hcl",
        members: [...content.matchAll(/uses\((\w+)\)/g)].map(
          (match) => match[1] as string,
        ),
        unresolved: [],
      };
    },
  };
}

function useProvider(extractor: ReferenceExtractorV1 = useExtractor()): void {
  proofReferenceExtractorLoader.load = async () => ({
    extractors: [extractor],
    problems: [],
  });
}

/** The reason a read of `files` is refused, or "ok". */
async function refusal(root: string, files: string): Promise<string> {
  const result = await readSource(
    root,
    {
      reader: "references",
      files,
      extract: "property",
      key: "acl",
    } as unknown as SourceSpec,
    evaluateSourceCode,
  );
  return result.ok ? "ok" : result.reason;
}

describe("Terraform override files", () => {
  test("names an override of the workspace's root folder without a ./ prefix", async () => {
    useProvider();
    const root = workspace({
      "main.tf": "uses(private)\n",
      "override.tf": "uses(public)\n",
    });
    const reason = await refusal(root, "main.tf");
    expect(reason).toContain(
      "override.tf may override values of this folder's blocks",
    );
    expect(reason).not.toContain("./override.tf");
  });

  test("names an override of a sub folder by its path", async () => {
    useProvider();
    const root = workspace({
      "infra/main.tf": "uses(private)\n",
      "infra/override.tf.json": "{}\n",
    });
    expect(await refusal(root, "infra/main.tf")).toContain(
      "infra/override.tf.json may override values of this folder's blocks",
    );
  });

  test("ignores files that only resemble an override, a .tofu file or a Terragrunt config", async () => {
    useProvider();
    const root = workspace({
      "main.tf": "uses(private)\n",
      "prod_override.tf.bak": "uses(public)\n",
      "main.tofu.orig": "uses(public)\n",
      "my-terragrunt.hcl": 'generate "acl" {}\n',
      "terragrunt.hcl.bak": 'generate "acl" {}\n',
      "notes.txt": 'include "root" {}\n',
    });
    expect(await refusal(root, "main.tf")).toBe("ok");
  });

  test("checks the folders of Terraform files only", async () => {
    useProvider();
    const root = workspace({
      "cmd/main.go": "uses(os)\n",
      "cmd/x_override.tf": "uses(public)\n",
    });
    expect(await refusal(root, "cmd/main.go")).toBe("ok");
    const hcl = workspace({
      "conf/main.tf.hcl": "uses(x)\n",
      "conf/override.tf": "uses(public)\n",
    });
    expect(await refusal(hcl, "conf/main.tf.hcl")).toBe("ok");
  });

  test("does not read a word that only ends in generate or include as a block", async () => {
    useProvider();
    const root = workspace({
      "main.tf": "uses(private)\n",
      "terragrunt.hcl": "inputs = {\n  regenerate = true\n  reinclude = 1\n}\n",
    });
    expect(await refusal(root, "main.tf")).toBe("ok");
  });

  test("refuses when the Terragrunt config cannot be read", async () => {
    useProvider();
    const root = workspace({ "main.tf": "uses(private)\n" });
    fs.symlinkSync(
      path.join(root, "no-such-file"),
      path.join(root, "terragrunt.hcl"),
    );
    expect(await refusal(root, "main.tf")).toContain(
      "terragrunt.hcl may generate files that override this folder's blocks",
    );
  });

  test("refuses when the folder cannot be listed for override files", async () => {
    let root = "";
    // The folder goes away after its file is read.
    useProvider(
      useExtractor(() =>
        fs.rmSync(path.join(root, "infra"), { recursive: true, force: true }),
      ),
    );
    root = workspace({ "infra/main.tf": "uses(private)\n" });
    expect(await refusal(root, "infra/main.tf")).toContain(
      "infra cannot be listed for override files",
    );
  });
});

describe("references reader refusals", () => {
  test("names the languages it reads for a file of another language", async () => {
    const root = workspace({ "docs/a.xyz": "x\n" });
    expect(await refusal(root, "docs/a.xyz")).toBe(
      "the references reader reads TypeScript, JavaScript, Python and SWI-Prolog files (and Go, Java, C#, Rust, PHP, C, Bash and Terraform/HCL through kibi-plugin-treesitter), not docs/a.xyz; Kibi cannot decide a references claim for those files, so the claim stays unproved (do not drop them from files: a claim about them would then be checked on other code)",
    );
  });

  test("reports a global handed on inside a class in an extends clause", () => {
    const result = extractScriptReferences(
      ts,
      "src/file.ts",
      "class A extends mix(class { m() { send(process); } }) {}\n",
      { reader: "references", extract: "env" } as unknown as SourceSpec,
    );
    expect(result.unresolved).toHaveLength(1);
  });

  test("does not report a global named in a type", () => {
    for (const code of ["let x: process.Env;\n", "let y: typeof process;\n"]) {
      const result = extractScriptReferences(ts, "src/file.ts", code, {
        reader: "references",
        extract: "env",
      } as unknown as SourceSpec);
      expect([code, result.unresolved]).toEqual([code, []]);
    }
  });
});
