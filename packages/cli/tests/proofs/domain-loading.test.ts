import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compiledToSourcePath,
  evaluateDomain,
  evaluateScalar,
  importsDomain,
  pythonDomainInterpreters,
} from "../../src/operations/proof/code-certificates.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-domain-loading-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

describe("domain loading without bun", () => {
  test("node loads a domain module with extensionless and .js-for-.ts imports", () => {
    const root = workspace({
      "src/limits.ts": "export const MAX = 3;\n",
      "src/labels.ts": "export const LABELS = ['a', 'b'] as const;\n",
      "src/domain.ts":
        "import { MAX } from './limits';\nimport { LABELS } from './labels.js';\nexport const LEVELS: readonly string[] = [...LABELS, String(MAX)];\n",
    });
    expect(
      evaluateDomain(root, "src/domain.ts", "LEVELS", { runners: ["node"] }),
    ).toEqual({ ok: true, count: 3, members: ["a", "b", "3"] });
  });
});

describe("a dotted export reads one field of an object", () => {
  test("TypeScript and Python policy objects", () => {
    const root = workspace({
      "src/policy.ts":
        "export const POLICY = { eventLimit: 200, windows: { hours: 24 } } as const;\n",
      "app/policy.py": "POLICY = {'event_limit': 200}\n",
    });
    expect(evaluateScalar(root, "src/policy.ts", "POLICY.eventLimit")).toEqual({
      ok: true,
      value: 200,
    });
    expect(
      evaluateScalar(root, "src/policy.ts", "POLICY.windows.hours"),
    ).toEqual({ ok: true, value: 24 });
    expect(evaluateScalar(root, "src/policy.ts", "POLICY.missing").ok).toBe(
      false,
    );
    expect(evaluateScalar(root, "app/policy.py", "POLICY.event_limit")).toEqual(
      { ok: true, value: 200 },
    );
  });
});

describe("Python domains", () => {
  test("Kibi reads an Enum, a tuple and a dict from a Python module", () => {
    const root = workspace({
      "backend/src/app/status.py":
        "import enum\nfrom app.extra import EXTRA\nfrom .extra import EXTRA as AGAIN\nclass Status(enum.Enum):\n    OPEN = 'open'\n    CLOSED = 'closed'\nMARKERS = ('dev', 'prod')\nROUTES = {'a': 1, 'b': 2}\n",
      "backend/src/app/__init__.py": "",
      "backend/src/app/extra.py": "EXTRA = 1\n",
    });
    expect(evaluateDomain(root, "backend/src/app/status.py", "Status")).toEqual(
      {
        ok: true,
        count: 2,
        members: ["open", "closed"],
      },
    );
    expect(
      evaluateDomain(root, "backend/src/app/status.py", "MARKERS"),
    ).toMatchObject({
      ok: true,
      members: ["dev", "prod"],
    });
    expect(
      evaluateDomain(root, "backend/src/app/status.py", "ROUTES"),
    ).toMatchObject({
      ok: true,
      members: ["a", "b"],
    });
    expect(
      evaluateDomain(root, "backend/src/app/status.py", "MISSING").ok,
    ).toBe(false);
  });

  test("a Python domain loads with the project virtualenv before the system interpreter", () => {
    const root = workspace({
      "backend/src/app/__init__.py": "",
      "backend/src/app/currencies.py":
        "import quotelib\nQUOTE_CURRENCIES = quotelib.CURRENCIES\n",
      "deps/quotelib.py": "CURRENCIES = ('USD', 'JPY')\n",
    });
    // Without the project environment the import fails, and the rejection
    // names the exception rather than the traceback header.
    const bare = evaluateDomain(
      root,
      "backend/src/app/currencies.py",
      "QUOTE_CURRENCIES",
    );
    expect(bare.ok).toBe(false);
    expect(bare.ok ? "" : bare.reason).toContain(
      "ModuleNotFoundError: No module named 'quotelib'",
    );

    // A project .venv whose interpreter can import the dependency wins.
    const venvPython = path.join(root, "backend", ".venv", "bin", "python");
    mkdirSync(path.dirname(venvPython), { recursive: true });
    writeFileSync(
      venvPython,
      `#!/bin/sh\nPYTHONPATH="${path.join(root, "deps")}" exec python3 "$@"\n`,
    );
    chmodSync(venvPython, 0o755);
    expect(
      pythonDomainInterpreters(root, "backend/src/app/currencies.py", {})[0],
    ).toBe(venvPython);
    expect(
      evaluateDomain(root, "backend/src/app/currencies.py", "QUOTE_CURRENCIES"),
    ).toEqual({ ok: true, count: 2, members: ["USD", "JPY"] });
  });

  test("KIBI_PYTHON and the active virtualenv come first", () => {
    const root = workspace({ "app/domain.py": "X = (1,)\n" });
    const active = path.join(root, "active-env");
    mkdirSync(path.join(active, "bin"), { recursive: true });
    writeFileSync(path.join(active, "bin", "python"), "");
    expect(
      pythonDomainInterpreters(root, "app/domain.py", {
        KIBI_PYTHON: "/opt/py/bin/python",
        VIRTUAL_ENV: active,
      }),
    ).toEqual([
      "/opt/py/bin/python",
      path.join(active, "bin", "python"),
      "python3",
      "python",
    ]);
  });

  test("a Python proof imports the domain module relatively or by dotted path", () => {
    const target = "backend/src/app/environment.py";
    expect(
      importsDomain(
        "from app.environment import ENVIRONMENT_MARKERS\n",
        "backend/tests/test_env.py",
        target,
        "ENVIRONMENT_MARKERS",
      ),
    ).toBe(true);
    expect(
      importsDomain(
        "from .environment import ENVIRONMENT_MARKERS\n",
        "backend/src/app/test_env.py",
        target,
        "ENVIRONMENT_MARKERS",
      ),
    ).toBe(true);
    expect(
      importsDomain(
        "import app.environment\nENVIRONMENT_MARKERS = app.environment.ENVIRONMENT_MARKERS\n",
        "backend/tests/test_env.py",
        target,
        "ENVIRONMENT_MARKERS",
      ),
    ).toBe(true);
    // A hand-listed domain imports nothing from the module.
    expect(
      importsDomain(
        "ENVIRONMENT_MARKERS = ['dev', 'prod']\nfrom app.other import x\n",
        "backend/tests/test_env.py",
        target,
        "ENVIRONMENT_MARKERS",
      ),
    ).toBe(false);
  });
});

describe("compiled-output imports", () => {
  test("an import from the TypeScript outDir maps back to the source under rootDir", () => {
    const root = workspace({
      "plugin/tsconfig.json":
        '{\n  // compiled to dist\n  "compilerOptions": { "outDir": "dist", "rootDir": "src", },\n}\n',
      "plugin/src/environment.ts": "export const MARKERS = ['dev'];\n",
    });
    expect(compiledToSourcePath(root, "plugin/dist/environment.js")).toBe(
      path.join("plugin", "src", "environment.js"),
    );
    expect(compiledToSourcePath(root, "plugin/src/environment.ts")).toBeNull();
    const proof = "import { MARKERS } from '../dist/environment.js';\n";
    expect(
      importsDomain(
        proof,
        "plugin/test/env.test.ts",
        "plugin/src/environment.ts",
        "MARKERS",
      ),
    ).toBe(false);
    expect(
      importsDomain(
        proof,
        "plugin/test/env.test.ts",
        "plugin/src/environment.ts",
        "MARKERS",
        root,
      ),
    ).toBe(true);
  });
});
