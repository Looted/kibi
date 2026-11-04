import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CHECK_POLICY_CONTRACT_VERSION } from "kibi-plugin-sdk";
import { readActiveCheckPolicies } from "../../src/plugins/check-policies.js";

// implements REQ-capability-check-policy

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const CAP = "kibi.check-policy.v1";

function workspace(
  plugins: { package: string; capabilities: Record<string, unknown> }[],
): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-check-policies-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      devDependencies: Object.fromEntries(plugins.map((p) => [p.package, "1"])),
      kibi: { plugins },
    }),
  );
  return root;
}

function install(
  root: string,
  name: string,
  manifest: Record<string, unknown>,
  files: Record<string, string> = {},
): void {
  const dir = path.join(root, "node_modules", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, main: "index.js", ...manifest }),
  );
  writeFileSync(path.join(dir, "index.js"), "module.exports = {};\n");
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  }
}

const DOCUMENT = {
  contractVersion: CHECK_POLICY_CONTRACT_VERSION,
  id: "team-policy",
  title: "Team policy",
};

const entry = (name: string) => ({
  package: name,
  capabilities: { [CAP]: { mode: "augment" } },
});

describe("readActiveCheckPolicies", () => {
  test("reads the declared policy document of each activated package", () => {
    const root = workspace([
      entry("pol-a"),
      entry("pol-b"),
      {
        package: "classifier",
        capabilities: { "kibi.semantic-classifier.v1": { mode: "augment" } },
      },
    ]);
    install(
      root,
      "pol-a",
      { version: "1.0.0", kibi: { checkPolicy: "policy/check.json" } },
      { "policy/check.json": JSON.stringify(DOCUMENT) },
    );
    install(
      root,
      "pol-b",
      { kibi: { checkPolicy: "p.json" } },
      { "p.json": JSON.stringify({ ...DOCUMENT, id: "other" }) },
    );
    expect(readActiveCheckPolicies(root)).toStrictEqual({
      policies: [
        { packageName: "pol-a", packageVersion: "1.0.0", document: DOCUMENT },
        {
          packageName: "pol-b",
          packageVersion: "unknown",
          document: { ...DOCUMENT, id: "other" },
        },
      ],
      errors: [],
    });
  });

  test("decodes the policy document as UTF-8", () => {
    const root = workspace([entry("pol-a")]);
    install(
      root,
      "pol-a",
      { version: "1", kibi: { checkPolicy: "p.json" } },
      { "p.json": JSON.stringify({ ...DOCUMENT, title: "Zasady zespołu" }) },
    );
    expect(readActiveCheckPolicies(root).policies[0]?.document.title).toBe(
      "Zasady zespołu",
    );
  });

  test("without a package.json or plugins there is nothing to read", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-check-policies-"));
    roots.push(root);
    expect(readActiveCheckPolicies(root)).toStrictEqual({
      policies: [],
      errors: [],
    });
    writeFileSync(path.join(root, "package.json"), "{}");
    expect(readActiveCheckPolicies(root)).toStrictEqual({
      policies: [],
      errors: [],
    });
  });

  test("an invalid project config is one package.json error", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-check-policies-"));
    roots.push(root);
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ kibi: { plugins: 3 } }),
    );
    expect(readActiveCheckPolicies(root)).toStrictEqual({
      policies: [],
      errors: [
        {
          packageName: "package.json",
          message: "kibi.plugins must be an array",
        },
      ],
    });
  });

  test("a malformed package.json is one package.json error", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-check-policies-"));
    roots.push(root);
    writeFileSync(path.join(root, "package.json"), "{oops");
    const { errors } = readActiveCheckPolicies(root);
    expect(errors.map((e) => e.packageName)).toStrictEqual(["package.json"]);
    expect(errors[0]?.message).toStartWith("Failed to parse package.json: ");
  });

  test("reports each package whose policy cannot be read", () => {
    const missingPath =
      "its package.json has no kibi.checkPolicy path to a kibi.check-policy.v1 document";
    const names = ["none", "arr", "nul", "num", "blank", "bad", "absent"];
    const root = workspace(names.map(entry).concat(entry("not-installed")));
    install(root, "none", {});
    install(root, "arr", { kibi: ["checkPolicy"] });
    install(root, "nul", { kibi: null });
    install(root, "num", { kibi: { checkPolicy: 3 } });
    install(root, "blank", { kibi: { checkPolicy: "  " } });
    install(
      root,
      "bad",
      { kibi: { checkPolicy: "p.json" } },
      { "p.json": JSON.stringify({ ...DOCUMENT, contractVersion: "x" }) },
    );
    install(root, "absent", { kibi: { checkPolicy: "missing.json" } });
    const result = readActiveCheckPolicies(root);
    expect(result.policies).toStrictEqual([]);
    expect(result.errors.slice(0, 5)).toStrictEqual(
      ["none", "arr", "nul", "num", "blank"].map((packageName) => ({
        packageName,
        message: missingPath,
      })),
    );
    expect(result.errors.slice(5).map((e) => e.packageName)).toStrictEqual([
      "bad",
      "absent",
      "not-installed",
    ]);
    expect(result.errors[5]?.message).toBe(
      `check policy contractVersion must be '${CHECK_POLICY_CONTRACT_VERSION}'`,
    );
  });

  test("a policy path may not escape the package root", () => {
    const root = workspace([entry("escape")]);
    install(root, "escape", { kibi: { checkPolicy: "../outside.json" } });
    writeFileSync(
      path.join(root, "node_modules", "outside.json"),
      JSON.stringify(DOCUMENT),
    );
    const { policies, errors } = readActiveCheckPolicies(root);
    expect(policies).toStrictEqual([]);
    expect(errors.map((e) => e.packageName)).toStrictEqual(["escape"]);
  });
});
