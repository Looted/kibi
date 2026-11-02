// executable_for TEST-source-analysis-v2-contract
import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { describe, it } from "node:test";
import {
  validateReferenceExtractionResult,
  validateSourceAnalysisResultV2,
} from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const {
  TreeSitterWorkerPool,
  createTreeSitterReferenceExtractor,
  createTreeSitterSymbolExtractor,
} = await import("../dist/extractor.js");

const isBun = process.versions.bun !== undefined;
const { normalizeTreeSitterLanguage } = await import("../dist/catalog.js");
const { createBoundedSourceAnalysisTimingEmitter } = await import(
  "../dist/performance-timing.js"
);

/**
 * A stand-in for a parser worker: it records what it is sent and lets a test
 * decide how it answers, errors or exits.
 */
class FakeWorker extends EventEmitter {
  sent = [];
  terminated = 0;
  constructor(onMessage) {
    super();
    this.onMessage = onMessage;
  }
  postMessage(message) {
    this.sent.push(message);
    this.onMessage?.(message, this);
  }
  ref() {}
  unref() {}
  terminate() {
    this.terminated += 1;
    // A worker that is already gone rejects; the pool must not care.
    return Promise.reject(new Error("already stopped"));
  }
}

class FakePool extends TreeSitterWorkerPool {
  workers = [];
  constructor(size, behaviour) {
    super(size);
    this.behaviour = behaviour;
  }
  spawn() {
    if (this.behaviour === "no-worker") return undefined;
    const worker = new FakeWorker(this.behaviour);
    this.workers.push(worker);
    this.live += 1;
    return { worker, uses: 0 };
  }
}

const answer = (result) => (message, worker) =>
  queueMicrotask(() => {
    worker.emit("message", { id: -1, result: { ok: false } });
    worker.emit("message", { id: message.id, result });
  });
const later = () => Date.now() + 5_000;

describe("Tree-sitter worker pool", () => {
  it("answers each request with its own reply and reuses a healthy worker", async () => {
    const pool = new FakePool(1, answer({ ok: true, members: [] }));
    const [first, second] = await Promise.all([
      pool.references("go", "package a", { extract: "calls" }, later()),
      pool.references("go", "package b", { extract: "calls" }, later()),
    ]);
    assert.deepEqual(first, { ok: true, members: [] });
    assert.deepEqual(second, { ok: true, members: [] });
    // The second request waited for the only worker instead of starting one.
    assert.equal(pool.workers.length, 1);
    assert.deepEqual(
      pool.workers[0].sent.map((message) => message.content),
      ["package a", "package b"],
    );
  });

  it("reports a worker error and starts a new worker for a waiting request", async () => {
    let calls = 0;
    const pool = new FakePool(1, (message, worker) => {
      calls += 1;
      if (calls === 1)
        queueMicrotask(() => worker.emit("error", new Error("boom")));
      else
        answer({ ok: true, members: ["x"], unresolved: [] })(message, worker);
    });
    const [failed, served] = await Promise.all([
      pool.references("go", "a", { extract: "calls" }, later()),
      pool.references("go", "b", { extract: "calls" }, later()),
    ]);
    assert.deepEqual(failed, {
      ok: false,
      code: "TREESITTER_WORKER_ERROR",
      message: "boom",
    });
    assert.equal(served.ok, true);
    assert.equal(pool.workers.length, 2);
    assert.equal(pool.workers[0].terminated, 1);
  });

  it("reports a worker that exits before answering", async () => {
    const pool = new FakePool(1, (_message, worker) =>
      queueMicrotask(() => worker.emit("exit", 3)),
    );
    const result = await pool.analyze("python", "x = 1\n", later());
    assert.deepEqual(result, {
      ok: false,
      code: "TREESITTER_WORKER_EXIT",
      message: "Tree-sitter worker exited before returning a result (code 3).",
    });
  });

  it("refuses when no worker can start", async () => {
    const pool = new FakePool(1, "no-worker");
    assert.deepEqual(await pool.analyze("python", "", later()), {
      ok: false,
      code: "TREESITTER_WORKER_ERROR",
      message: "Could not start Tree-sitter worker.",
    });
  });

  it("times out without sending once the budget is already spent", async () => {
    const pool = new FakePool(1, answer({ ok: true }));
    const result = await pool.analyze("python", "", Date.now() - 1);
    assert.equal(result.code, "TREESITTER_ANALYSIS_TIMEOUT");
    // The unused worker stays healthy and idle for the next request.
    assert.equal(pool.workers[0].sent.length, 0);
    assert.equal(pool.workers[0].terminated, 0);
    assert.deepEqual(
      pool.idle.map((pooled) => pooled.worker),
      pool.workers,
    );
  });

  it("recycles a worker after 256 analyses", async () => {
    const pool = new FakePool(1, answer({ ok: true, members: [] }));
    for (let index = 0; index < 257; index += 1)
      await pool.references("go", "", { extract: "calls" }, later());
    assert.equal(pool.workers.length, 2);
    assert.equal(pool.workers[0].terminated, 1);
    assert.equal(pool.workers[0].sent.length, 256);
    assert.equal(pool.workers[1].sent.length, 1);
  });

  it("drops an idle worker that crashes and serves the next file from a new one", async () => {
    const pool = new TreeSitterWorkerPool(1);
    const input = "def f():\n    pass\n";
    assert.equal((await pool.analyze("python", input, later())).ok, true);
    const [{ worker }] = pool.idle;
    // A message the worker cannot read crashes it while it sits idle.
    worker.ref();
    const exited = new Promise((resolve) => worker.once("exit", resolve));
    worker.postMessage(null);
    await exited;
    assert.equal(pool.idle.length, 0);
    assert.equal(pool.live, 0);
    const next = await pool.analyze("python", input, later());
    assert.equal(next.ok, true);
    assert.deepEqual(
      next.symbols.map((symbol) => symbol.name),
      ["f"],
    );
  });

  it("discards a busy worker that times out", async () => {
    const pool = new TreeSitterWorkerPool(1);
    assert.equal((await pool.analyze("python", "x = 1\n", later())).ok, true);
    const [{ worker }] = pool.idle;
    const content = "def f(a, b):\n    return a + b\n".repeat(20_000);
    const exited = once(worker, "exit");
    // Long enough to be sent, far too short to parse 40k lines.
    const result = await pool.analyze("python", content, Date.now() + 25);
    assert.equal(result.code, "TREESITTER_ANALYSIS_TIMEOUT");
    await exited;
    assert.equal(pool.idle.length, 0);
    assert.equal(pool.live, 0);
  });

  it("reports a language without a grammar and one without a reference reader", async () => {
    const pool = new TreeSitterWorkerPool(1);
    const missing = await pool.analyze("cobol", "", later());
    assert.deepEqual(missing, {
      ok: false,
      code: "TREESITTER_RUNTIME_ERROR",
      message: "catalog.json has no entry for cobol",
    });
    // A failed grammar load is not cached: the same request fails the same way.
    assert.deepEqual(await pool.analyze("cobol", "", later()), missing);
    const noReader = await pool.references(
      "python",
      "",
      { extract: "calls" },
      later(),
    );
    assert.deepEqual(noReader, {
      ok: false,
      code: "TREESITTER_REFERENCES_UNSUPPORTED",
      message: "no reference reader for python",
    });
  });

  it(
    "refuses when the worker runtime cannot start a thread",
    { skip: isBun && "needs Node live builtin bindings" },
    async () => {
      const { syncBuiltinESMExports } = await import("node:module");
      const threads = await import("node:worker_threads");
      const original = threads.default.Worker;
      threads.default.Worker = function Refused() {
        throw new Error("no threads here");
      };
      syncBuiltinESMExports();
      try {
        const result = await new TreeSitterWorkerPool(1).analyze(
          "python",
          "",
          later(),
        );
        assert.deepEqual(result, {
          ok: false,
          code: "TREESITTER_WORKER_ERROR",
          message: "Could not start Tree-sitter worker.",
        });
      } finally {
        threads.default.Worker = original;
        syncBuiltinESMExports();
      }
    },
  );
});

/** A pool that answers every request with a fixed result. */
const fixedPool = (result) => ({
  analyze: async () => result,
  references: async () => result,
});

describe("symbol extractor dispatch", () => {
  it("names the requested language, or the extension, when it is unsupported", async () => {
    const extractor = createTreeSitterSymbolExtractor(fixedPool({ ok: true }));
    const explicit = await extractor.analyze({
      path: "a.txt",
      content: "x",
      language: "COBOL",
    });
    assert.equal(explicit.language, "cobol");
    assert.match(explicit.diagnostics[0].message, /for 'COBOL'/);
    const bare = await extractor.analyze({ path: "Makefile", content: "x" });
    assert.equal(bare.language, "unknown");
    assert.equal(bare.module.title, "Makefile");
    // A blank language falls back to the path.
    const blank = await extractor.analyze({
      path: "a.py",
      content: "",
      language: "  ",
      timeoutMs: Number.NaN,
    });
    assert.equal(blank.language, "python");
  });

  it("refuses input over the UTF-8 byte bound", async () => {
    const extractor = createTreeSitterSymbolExtractor(fixedPool({ ok: true }));
    const content = "€".repeat(700_000);
    const result = await extractor.analyze({ path: "a.py", content });
    assert.equal(result.status, "failed");
    assert.equal(result.diagnostics[0].code, "TREESITTER_INPUT_LIMIT");
    assert.deepEqual(
      validateSourceAnalysisResultV2(result, {
        path: "a.py",
        content,
      }),
      result,
    );
  });

  it("emits finite parser timings and drops malformed ones", async () => {
    const timings = (value) => ({
      ok: true,
      status: "ok",
      symbols: [],
      diagnostics: [],
      uncoveredRanges: [],
      performanceTimings: {
        parserInitializationWallMs: 1,
        parseWallMs: 2,
        analysisWallMs: 3,
        totalAnalysisWallMs: value,
      },
    });
    const written = [];
    const write = process.stderr.write;
    process.stderr.write = (chunk) => {
      written.push(String(chunk));
      return true;
    };
    try {
      for (const value of [6, Number.NaN, -1]) {
        const result = await createTreeSitterSymbolExtractor(
          fixedPool(timings(value)),
        ).analyze({ path: "a.py", content: "" });
        assert.equal(result.status, "ok");
        assert.equal("performanceTimings" in result, false);
      }
    } finally {
      process.stderr.write = write;
    }
    const events = written
      .filter((line) => line.startsWith("[kibi-performance] "))
      .map((line) => JSON.parse(line.slice("[kibi-performance] ".length)));
    assert.deepEqual(events, [
      {
        kind: "source-analysis",
        language: "python",
        parserInitializationWallMs: 1,
        parseWallMs: 2,
        analysisWallMs: 3,
        totalAnalysisWallMs: 6,
      },
    ]);
  });
});

describe("Bash shebang dialects", () => {
  const extractor = createTreeSitterSymbolExtractor(
    fixedPool({
      ok: true,
      status: "ok",
      symbols: [],
      diagnostics: [],
      uncoveredRanges: [],
    }),
  );
  const dialectOf = async (shebang) => {
    const result = await extractor.analyze({
      path: "run.sh",
      content: `${shebang}\necho hi\n`,
    });
    if (result.status === "ok") return "bash";
    assert.equal(
      result.diagnostics[0].code,
      "TREESITTER_SHELL_DIALECT_UNSUPPORTED",
    );
    return result.diagnostics[0].message.replace(
      /^The installed shell catalog covers Bash syntax, not (.*)\.$/,
      "$1",
    );
  };

  it("accepts Bash behind env options it understands", async () => {
    for (const shebang of [
      "#!/bin/b\\ash",
      "#!/usr/bin/env -Sbash",
      "#!/usr/bin/env -- /bin/bash",
      "#!/usr/bin/env -i bash",
      "#!/usr/bin/env -C /tmp bash",
      "#!/usr/bin/env --argv0 x bash",
      "#!/usr/bin/env --unset=TRACE bash",
      "#!/usr/bin/env --chdir=/tmp bash",
      "#!/usr/bin/env --argv0=x bash",
      "#!/usr/bin/env 'bash'",
    ])
      assert.equal(await dialectOf(shebang), "bash", shebang);
  });

  it("names other interpreters and refuses shebangs it cannot read", async () => {
    const cases = [
      // Inside single quotes a backslash stays, and then separates a path.
      ["#!/usr/bin/env 'ba\\sh'", "sh"],
      ["#!/usr/bin/env", "unknown interpreter"],
      ["#!/usr/bin/env --", "unknown interpreter"],
      ["#!/usr/bin/env -u", "unknown interpreter"],
      ["#!/usr/bin/env -u ''", "unknown interpreter"],
      ["#!/usr/bin/env -C", "unknown interpreter"],
      ["#!/usr/bin/env --unset=", "unknown interpreter"],
      ["#!/usr/bin/env --chdir=", "unknown interpreter"],
      ["#!/usr/bin/env -x bash", "unknown interpreter"],
      ["#!/usr/bin/env -S", "unknown interpreter"],
      ['#!/usr/bin/env -S \\"bash', "unknown interpreter"],
      ['#!/usr/bin/env --split-string=\\"bash', "unknown interpreter"],
      ['#!/usr/bin/env "-S\'bash"', "unknown interpreter"],
      ["#!", "unrecognized interpreter"],
      ["#!/bin/bash\\", "unrecognized interpreter"],
      ["#!/bin/bash 'open", "unrecognized interpreter"],
      [`#!/bin/${"x".repeat(300)}`, "unrecognized interpreter"],
      [
        `#!/usr/bin/env ${Array.from({ length: 17 }, (_, i) => `A${i}=1`).join(" ")} bash`,
        "unrecognized interpreter",
      ],
    ];
    for (const [shebang, dialect] of cases)
      assert.equal(await dialectOf(shebang), dialect, shebang);
    // A shebang that is the whole file.
    const whole = await extractor.analyze({
      path: "run.sh",
      content: "#!/bin/zsh",
    });
    assert.match(whole.diagnostics[0].message, /not zsh\.$/);
    const long = await extractor.analyze({
      path: "run.sh",
      content: `#!/bin/${"y".repeat(2_100)}`,
    });
    assert.match(long.diagnostics[0].message, /not unrecognized interpreter/);
  });
});

describe("reference extractor dispatch", () => {
  it("refuses input over the size bounds", async () => {
    const extractor = createTreeSitterReferenceExtractor(
      fixedPool({ ok: true, members: [], unresolved: [] }),
    );
    for (const content of ["x".repeat(1_048_577), "€".repeat(700_000)]) {
      const result = await extractor.extract({
        path: "a.go",
        content,
        extract: "calls",
      });
      assert.deepEqual(validateReferenceExtractionResult(result), result);
      assert.equal(result.status, "failed");
      assert.equal(result.code, "TREESITTER_INPUT_LIMIT");
      assert.equal(result.language, "go");
    }
  });

  it("passes the host budget and the request on to the worker", async () => {
    const seen = [];
    const extractor = createTreeSitterReferenceExtractor({
      references: async (language, content, request, deadline) => {
        seen.push({
          language,
          content,
          request,
          budget: deadline - Date.now(),
        });
        return { ok: true, members: ["m"], unresolved: [] };
      },
    });
    const result = await extractor.extract({
      path: "a.rs",
      content: "fn f() {}",
      extract: "string_args",
      callee: "println",
      key: "k",
      timeoutMs: 50,
    });
    assert.equal(result.status, "ok");
    assert.deepEqual(result.members, ["m"]);
    assert.deepEqual(seen[0].request, {
      extract: "string_args",
      callee: "println",
      key: "k",
    });
    assert.ok(seen[0].budget <= 50);
  });
});

describe("catalog and timing helpers", () => {
  it("normalizes no language to none", () => {
    assert.equal(normalizeTreeSitterLanguage(undefined), undefined);
    assert.equal(normalizeTreeSitterLanguage(" GoLang "), "go");
  });

  const event = { kind: "source-analysis", language: "go" };

  it("writes no truncation marker that would itself break the byte bound", () => {
    const lines = [];
    const emit = createBoundedSourceAnalysisTimingEmitter(
      (line) => lines.push(line),
      { maxEvents: 10, maxBytes: 10 },
    );
    emit(event);
    emit(event);
    assert.deepEqual(lines, []);
  });

  it("stops quietly when the writer fails on an event or on the marker", () => {
    const attempts = [];
    const failing = createBoundedSourceAnalysisTimingEmitter((line) => {
      attempts.push(line);
      throw new Error("closed");
    });
    failing(event);
    failing(event);
    // The first failure disables the stream: nothing is attempted again.
    assert.equal(attempts.length, 1);

    const written = [];
    const markerFails = createBoundedSourceAnalysisTimingEmitter(
      (line) => {
        if (line.includes("source-analysis-truncated"))
          throw new Error("closed");
        written.push(line);
      },
      { maxEvents: 2, maxBytes: 4096 },
    );
    markerFails(event);
    markerFails(event);
    markerFails(event);
    assert.equal(written.length, 1);
  });
});
