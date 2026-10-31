// executable_for TEST-kibi-tree-sitter-language-packs
import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { syncBuiltinESMExports } from "node:module";
import { describe, it, mock } from "node:test";
import { Worker } from "node:worker_threads";

// These tests change what the installed packs look like to this process (or
// to one parser worker) without touching the packs on disk: Node's live
// builtin bindings let a stubbed fs reach the plugin's own `import`s. Packs
// resolve through workspace symlinks, so paths end in `lang-<id>/...`.
const nodeOnly =
  process.versions.bun !== undefined && "needs Node live builtin bindings";

const packs = await import("../dist/language-packs.js");
const catalog = JSON.parse(
  fs.readFileSync(new URL("../catalog.json", import.meta.url), "utf8"),
);
const entry = (id) => catalog.languages.find((item) => item.id === id);

/** Run `body` with fs functions answering differently for matching paths. */
async function withFs(overrides, body) {
  for (const [name, replace] of Object.entries(overrides)) {
    const original = fs[name];
    mock.method(fs, name, (path, ...rest) => {
      const answer = replace(String(path), () =>
        original.call(fs, path, ...rest),
      );
      return answer;
    });
  }
  syncBuiltinESMExports();
  try {
    return await body();
  } finally {
    mock.restoreAll();
    syncBuiltinESMExports();
  }
}

describe("language pack resolution in the host", { skip: nodeOnly }, () => {
  it("lists every pack once with the languages it carries", () => {
    const listed = packs.languagePacks();
    const hcl = listed.find((pack) => pack.package === "kibi-lang-hcl");
    assert.deepEqual(hcl, {
      package: "kibi-lang-hcl",
      version: "1.0.0",
      languages: ["terraform", "hcl"],
    });
    assert.equal(
      listed.length,
      new Set(catalog.languages.map((item) => item.pack)).size,
    );
  });

  it("refuses a language the catalog does not know", () => {
    assert.throws(() => packs.languagePackOf("cobol"), {
      message: "catalog.json has no entry for cobol",
    });
  });

  it("reports a pack whose manifest disappeared after it was first found", async () => {
    assert.equal(packs.languagePackProblem("go"), undefined);
    const problem = await withFs(
      {
        existsSync: (path, real) =>
          path.endsWith("lang-go/package.json") ? false : real(),
      },
      () => packs.languagePackProblem("go"),
    );
    assert.deepEqual(problem, {
      code: packs.LANGUAGE_PACK_MISSING,
      message:
        "Go files need kibi-lang-go 1.0.0, which is not installed. Run: npm install --save-dev kibi-lang-go@1.0.0",
    });
    // Once the manifest is back, the pack is usable again.
    assert.equal(packs.languagePackProblem("go"), undefined);
  });

  it("reports a pack Node cannot resolve", async () => {
    const original = Module._resolveFilename;
    Module._resolveFilename = function (request, ...rest) {
      if (request === "kibi-lang-ruby/package.json") {
        const error = new Error(`Cannot find module '${request}'`);
        error.code = "MODULE_NOT_FOUND";
        throw error;
      }
      return original.call(this, request, ...rest);
    };
    try {
      const problem = packs.languagePackProblem("ruby");
      assert.equal(problem?.code, packs.LANGUAGE_PACK_MISSING);
      assert.match(problem.message, /^Ruby files need kibi-lang-ruby 1\.0\.0/);
    } finally {
      Module._resolveFilename = original;
    }
  });

  it("reports another installed version and lets other manifest errors through", async () => {
    const manifest = (text) => ({
      readFileSync: (path, real) =>
        path.endsWith("lang-java/package.json") ? text : real(),
    });
    const other = await withFs(
      manifest(JSON.stringify({ name: "kibi-lang-java", version: "2.0.0" })),
      () => packs.languagePackProblem("java"),
    );
    assert.equal(other?.code, packs.LANGUAGE_PACK_VERSION);
    assert.match(other.message, /but 2\.0\.0 is installed/);
    await withFs(manifest("{ not json"), () =>
      assert.throws(() => packs.languagePackProblem("java"), SyntaxError),
    );
  });

  it("serves a pack's grammar bytes only while they match the pinned digest", async () => {
    const bytes = packs.grammarSource("rust");
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes.byteLength, entry("rust").assetBytes);
    const flipped = (path, real) => {
      const value = real();
      if (!path.endsWith("tree-sitter-rust.wasm")) return value;
      const copy = Buffer.from(value);
      copy[0] ^= 1;
      return copy;
    };
    await withFs({ readFileSync: flipped }, () =>
      assert.throws(
        () => packs.grammarSource("rust"),
        (error) => {
          assert.ok(error instanceof packs.LanguagePackError);
          assert.equal(error.name, "LanguagePackError");
          assert.equal(error.code, packs.LANGUAGE_PACK_MISMATCH);
          assert.match(
            error.message,
            /kibi-lang-rust\/tree-sitter-rust\.wasm is not the Rust grammar/,
          );
          return true;
        },
      ),
    );
  });
});

describe(
  "extractors refuse a missing pack before parsing",
  { skip: nodeOnly },
  () => {
    it("returns the install line from both capabilities", async () => {
      const {
        createTreeSitterReferenceExtractor,
        createTreeSitterSymbolExtractor,
      } = await import("../dist/index.js");
      const gone = {
        existsSync: (path, real) =>
          /lang-(?:python|go)\/package\.json$/.test(path) ? false : real(),
      };
      const [symbols, references] = await withFs(gone, () =>
        Promise.all([
          createTreeSitterSymbolExtractor().analyze({
            path: "a.py",
            content: "x = 1\n",
          }),
          createTreeSitterReferenceExtractor().extract({
            path: "a.go",
            content: "package a\n",
            extract: "imports",
          }),
        ]),
      );
      assert.equal(symbols.status, "unsupported");
      assert.equal(symbols.diagnostics[0].code, packs.LANGUAGE_PACK_MISSING);
      assert.match(
        symbols.module.fallbackReason,
        /npm install --save-dev kibi-lang-python@1\.0\.0/,
      );
      assert.equal(references.status, "unsupported");
      assert.equal(references.code, packs.LANGUAGE_PACK_MISSING);
      assert.equal(references.language, "go");
      assert.match(references.message, /kibi-lang-go@1\.0\.0/);
    });
  },
);

/**
 * Start the real parser worker with its grammar reads failing in one way,
 * and ask it for one symbol analysis and one reference read.
 */
async function faultyWorker(fault) {
  const worker = new Worker(
    `
    const fs = require("node:fs");
    const { syncBuiltinESMExports } = require("node:module");
    const { parentPort, workerData } = require("node:worker_threads");
    const original = fs.readFileSync;
    fs.readFileSync = function (path, ...rest) {
      if (String(path).endsWith("tree-sitter-go.wasm")) {
        if (workerData.fault === "bytes") {
          const bytes = Buffer.from(original.call(fs, path, ...rest));
          bytes[0] ^= 1;
          return bytes;
        }
        if (workerData.fault === "error") throw new Error("disk read failed");
        throw "disk read failed";
      }
      return original.call(fs, path, ...rest);
    };
    syncBuiltinESMExports();
    import(workerData.url).then(() => {
      parentPort.on("message", (message) => {
        if (message.probe !== "fetch") return;
        globalThis.fetch("https://example.invalid/").then(
          () => parentPort.postMessage({ probe: "fetched" }),
          (error) => parentPort.postMessage({ probe: error.message }),
        );
      });
      parentPort.postMessage({ ready: true });
    });
    `,
    {
      eval: true,
      execArgv: [],
      workerData: {
        fault,
        url: new URL("../dist/analysis-worker.js", import.meta.url).href,
      },
    },
  );
  const replies = new Map();
  const waiting = new Map();
  worker.on("message", (message) => {
    const key = message.ready
      ? "ready"
      : message.probe !== undefined
        ? "probe"
        : message.id;
    if (key === undefined) return;
    replies.set(key, message);
    waiting.get(key)?.(message);
  });
  const reply = (key) =>
    replies.has(key)
      ? Promise.resolve(replies.get(key))
      : new Promise((resolve) => waiting.set(key, resolve));
  await reply("ready");
  worker.postMessage({ id: 1, language: "go", content: "package a\n" });
  worker.postMessage({
    id: 2,
    language: "go",
    content: "package a\n",
    references: { extract: "calls" },
  });
  worker.postMessage({ probe: "fetch" });
  const [analysis, references, fetched] = await Promise.all([
    reply(1),
    reply(2),
    reply("probe"),
  ]);
  await worker.terminate();
  return {
    analysis: analysis.result,
    references: references.result,
    fetched: fetched.probe,
  };
}

describe(
  "language pack faults inside the parser worker",
  { skip: nodeOnly },
  () => {
    it("fails both reads when the grammar bytes changed after the host check", async () => {
      const { analysis, references } = await faultyWorker("bytes");
      for (const result of [analysis, references]) {
        assert.equal(result.ok, false);
        assert.equal(result.code, packs.LANGUAGE_PACK_MISMATCH);
        assert.match(result.message, /is not the Go grammar/);
      }
    });

    it("reports a grammar read error as a runtime error", async () => {
      const { analysis, references } = await faultyWorker("error");
      const expected = {
        ok: false,
        code: "TREESITTER_RUNTIME_ERROR",
        message: "disk read failed",
      };
      assert.deepEqual(analysis, expected);
      assert.deepEqual(references, expected);
    });

    it("reports a thrown non-error as an unknown runtime error and never fetches", async () => {
      const { analysis, references, fetched } = await faultyWorker("value");
      const expected = {
        ok: false,
        code: "TREESITTER_RUNTIME_ERROR",
        message: "Unknown parser runtime error.",
      };
      assert.deepEqual(analysis, expected);
      assert.deepEqual(references, expected);
      assert.equal(
        fetched,
        "Network access is disabled in Tree-sitter analysis workers.",
      );
    });
  },
);

describe("parser worker entry point", () => {
  it("refuses to start outside a worker thread", async () => {
    await assert.rejects(import("../dist/analysis-worker.js"), {
      message: "Tree-sitter worker requires a parent port.",
    });
  });
});
