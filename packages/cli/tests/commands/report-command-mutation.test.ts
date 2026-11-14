import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import * as githubInit from "../../src/commands/github-init.js";
import {
  type ReportCommandDeps,
  openReport,
  reportCommand,
} from "../../src/commands/report.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import * as brand from "../../src/report/brand.js";
import { KIBI_BRAND } from "../../src/report/brand.js";
import * as htmlReport from "../../src/report/html-report.js";
import * as repository from "../../src/report/repository.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import * as migrateHint from "../../src/utils/migrate-hint.js";

const restores: Array<() => void> = [];
const dirs: string[] = [];
let logs: string[] = [];
let rendered: unknown[] = [];
let badges: unknown[][] = [];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

beforeEach(() => {
  logs = [];
  rendered = [];
  badges = [];
  track(
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
  );
  track(
    spyOn(htmlReport, "renderHtmlReport").mockImplementation((input) => {
      rendered.push(input);
      return "<html>report</html>";
    }),
  );
  track(
    spyOn(brand, "renderKibiBadge").mockImplementation((...args) => {
      badges.push(args);
      return "<svg>badge</svg>";
    }),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-report-mut-"));
  dirs.push(dir);
  return dir;
}

type Row = Record<string, unknown>;

function coverage(
  summary: Record<string, unknown> = { total: 1, proofTested: 1 },
  rows: Row[] = [{ id: "REQ-1" }],
  meta?: Record<string, unknown>,
) {
  return {
    branch: "main",
    requirements: {
      summary,
      rows,
      ...(meta === undefined ? {} : { meta }),
    },
    symbols: { summary: { total: 0 }, rows: [] },
  };
}

const fixedRepo = { provider: "unknown" } as never;

function deps(
  root: string,
  data: ReturnType<typeof coverage> = coverage(),
  extra: Partial<ReportCommandDeps> = {},
) {
  const calls: unknown[][] = [];
  const value: ReportCommandDeps = {
    loadCoverage: async (tags, limit) => {
      calls.push([tags, limit]);
      return data;
    },
    now: () => new Date("2026-01-02T03:04:05Z"),
    cwd: () => root,
    repository: fixedRepo,
    ...extra,
  };
  return { value, calls };
}

describe("reportCommand options", () => {
  test("parses tags and the limit", async () => {
    const root = tempDir();
    const { value, calls } = deps(root);
    await reportCommand({ tag: " a, ,b ,", limit: " 5 " }, value);
    await reportCommand({}, value);
    await reportCommand({ limit: "1" }, value);
    await reportCommand({ limit: "100000" }, value);
    expect(calls).toStrictEqual([
      [["a", "b"], 5],
      [[], 10000],
      [[], 1],
      [[], 100000],
    ]);
  });

  test("rejects limits outside 1..100000 and non-digits", async () => {
    const root = tempDir();
    const { value, calls } = deps(root);
    for (const limit of [
      "0",
      "100001",
      "5x",
      "x5",
      "-1",
      "1.5",
      "",
      "1e3",
      "+5",
      "0x10",
    ]) {
      await expect(reportCommand({ limit }, value)).rejects.toThrow(
        new Error("Report limit must be an integer between 1 and 100000"),
      );
    }
    expect(
      reportCommand({ limit: "99999999999999999999" }, value),
    ).rejects.toThrow("Report limit must be an integer between 1 and 100000");
    expect(calls).toStrictEqual([]);
  });

  test("requires every requirement row", async () => {
    const root = tempDir();
    const short = deps(root, coverage({ total: 3 }, [{}, {}]));
    await expect(reportCommand({ limit: "2" }, short.value)).rejects.toThrow(
      new Error(
        "Report requires complete requirement rows, but 2 of 3 were returned. Increase --limit above 2.",
      ),
    );
    for (const summary of [{ total: 2 }, {}, { total: "many" }]) {
      const ok = deps(root, coverage(summary, [{}, {}]));
      expect(await reportCommand({}, ok.value)).toBe(
        path.join(root, "kibi-report", "index.html"),
      );
    }
  });
});

describe("reportCommand outputs", () => {
  test("writes a directory report with its badge", async () => {
    const root = tempDir();
    const { value } = deps(root);
    for (const output of [undefined, "  ", "out", " out/dir.d "]) {
      logs = [];
      const target = await reportCommand(
        output === undefined ? {} : { output },
        value,
      );
      const dir = path.join(
        root,
        output?.trim() ? output.trim() : "kibi-report",
      );
      expect(target).toBe(path.join(dir, "index.html"));
      expect(readFileSync(target).toString()).toBe("<html>report</html>");
      expect(readFileSync(path.join(dir, "badge.svg")).toString()).toBe(
        "<svg>badge</svg>",
      );
      expect(readdirSync(dir).sort()).toStrictEqual([
        "badge.svg",
        "index.html",
      ]);
      expect(logs).toStrictEqual([
        `Kibi report written to ${target}`,
        `Kibi badge written to ${path.join(dir, "badge.svg")}`,
      ]);
    }
  });

  test("writes an html file report with a named badge", async () => {
    const root = tempDir();
    const { value } = deps(root);
    for (const [output, base] of [
      ["site/r.html", "r"],
      ["site/R.HTM", "R"],
      ["site/x.Html", "x"],
    ] as const) {
      const target = await reportCommand({ output }, value);
      expect(target).toBe(path.join(root, output));
      expect(readFileSync(target).toString()).toBe("<html>report</html>");
      expect(
        readFileSync(path.join(root, "site", `${base}.badge.svg`)).toString(),
      ).toBe("<svg>badge</svg>");
    }
    const absolute = path.join(tempDir(), "abs.html");
    expect(await reportCommand({ output: absolute }, value)).toBe(absolute);
  });

  test("passes the coverage, date and repository to the renderer", async () => {
    const root = tempDir();
    const data = coverage();
    const { value } = deps(root, data);
    await reportCommand({}, value);
    expect(rendered).toStrictEqual([
      {
        requirements: data.requirements,
        symbols: data.symbols,
        branch: "main",
        generatedAt: new Date("2026-01-02T03:04:05Z"),
        repository: fixedRepo,
      },
    ]);
  });

  test("defaults the clock and working directory", async () => {
    const root = tempDir();
    const cwd = track(spyOn(process, "cwd").mockReturnValue(root));
    const before = Date.now();
    const { value } = deps(root);
    const { now: _now, cwd: _cwd, ...rest } = value;
    expect(await reportCommand({}, rest)).toBe(
      path.join(root, "kibi-report", "index.html"),
    );
    expect(cwd).toHaveBeenCalled();
    const at = (rendered[0] as { generatedAt: Date }).generatedAt.getTime();
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
  });

  test("removes the temporary file when a write fails", async () => {
    const root = tempDir();
    track(
      spyOn(fsp, "writeFile").mockImplementation((async (file: string) => {
        writeFileSync(file, "partial");
        throw new Error("disk full");
      }) as never),
    );
    const { value } = deps(root);
    await expect(reportCommand({}, value)).rejects.toThrow(
      new Error("disk full"),
    );
    expect(readdirSync(path.join(root, "kibi-report"))).toStrictEqual([]);
  });

  test("keeps the write error when no temporary file was made", async () => {
    const root = tempDir();
    track(
      spyOn(fsp, "writeFile").mockRejectedValue(
        new Error("read-only") as never,
      ),
    );
    await expect(reportCommand({}, deps(root).value)).rejects.toThrow(
      new Error("read-only"),
    );
  });

  test("names temporary files after the target", async () => {
    const root = tempDir();
    const seen: string[] = [];
    const real = fsp.writeFile;
    track(
      spyOn(fsp, "writeFile").mockImplementation((async (
        file: string,
        data: string,
        ...rest: unknown[]
      ) => {
        seen.push(path.relative(root, file));
        expect(rest).toStrictEqual([]);
        return real(file, data);
      }) as never),
    );
    await reportCommand({}, deps(root).value);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatch(/^kibi-report\/\.index\.html\.[0-9a-f-]{36}\.tmp$/);
    expect(seen[1]).toMatch(/^kibi-report\/\.badge\.svg\.[0-9a-f-]{36}\.tmp$/);
  });

  test("opens the report only when asked", async () => {
    const root = tempDir();
    const opened: string[] = [];
    const { value } = deps(root, coverage(), {
      openReport: async (file) => {
        opened.push(file);
      },
    });
    await reportCommand({ open: false }, value);
    logs = [];
    const target = await reportCommand({ open: true }, value);
    expect(opened).toStrictEqual([target]);
    expect(logs.at(-1)).toBe("Opened Kibi report in the default browser");
  });
});

describe("reportCommand migration hint", () => {
  test("prints the schema migration hint for the workspace before the paths", async () => {
    const root = tempDir();
    const hint = track(
      spyOn(migrateHint, "printSchemaMigrationHint").mockImplementation(() => {
        logs.push("HINT");
      }),
    );
    await reportCommand({ output: "out" }, deps(root).value);
    expect(hint).toHaveBeenCalledWith(root);
    expect(logs[0]).toBe("HINT");
  });
});

describe("reportCommand certificates", () => {
  const bundle = (certificates: unknown) =>
    JSON.stringify({ version: "kibi.certificates.v1", certificates });

  test("publishes the bundle next to a directory report", async () => {
    const root = tempDir();
    const raw = bundle([
      { kind: "proof" },
      { kind: "proof" },
      { kind: 3 },
      null,
      "x",
      {},
    ]);
    writeFileSync(path.join(root, "certs.json"), raw);
    const { value } = deps(root);
    const target = await reportCommand({ certificates: " certs.json " }, value);
    const out = path.join(root, "kibi-report", "kb-certificates.json");
    expect(readFileSync(out).toString()).toBe(raw);
    expect(
      (rendered[0] as { kbCertificates: unknown }).kbCertificates,
    ).toStrictEqual({
      count: 6,
      kinds: { proof: 2, unknown: 4 },
      href: "kb-certificates.json",
    });
    expect(logs).toStrictEqual([
      `Kibi report written to ${target}`,
      `Kibi badge written to ${path.join(root, "kibi-report", "badge.svg")}`,
      `KB certificates written to ${out}`,
    ]);
  });

  test("names the bundle after an html report", async () => {
    const root = tempDir();
    const certs = path.join(tempDir(), "c.json");
    writeFileSync(certs, bundle([]));
    await reportCommand(
      { output: "pub/page.htm", certificates: certs },
      deps(root).value,
    );
    expect(
      existsSync(path.join(root, "pub", "page.kb-certificates.json")),
    ).toBe(true);
    expect(
      (rendered[0] as { kbCertificates: unknown }).kbCertificates,
    ).toStrictEqual({ count: 0, kinds: {}, href: "page.kb-certificates.json" });
  });

  test("ignores a blank certificates option", async () => {
    const root = tempDir();
    await reportCommand({ certificates: "  " }, deps(root).value);
    expect(Object.hasOwn(rendered[0] as object, "kbCertificates")).toBe(false);
    expect(readdirSync(path.join(root, "kibi-report")).sort()).toStrictEqual([
      "badge.svg",
      "index.html",
    ]);
  });

  test("rejects bundles that are not JSON or not v1", async () => {
    const root = tempDir();
    const file = path.join(root, "c.json");
    writeFileSync(file, "{nope");
    await expect(
      reportCommand({ certificates: "c.json" }, deps(root).value),
    ).rejects.toThrow(new Error(`report: ${file} is not JSON`));
    for (const content of [
      "null",
      "5",
      '"text"',
      JSON.stringify({ version: "kibi.certificates.v2", certificates: [] }),
      JSON.stringify({ version: "kibi.certificates.v1", certificates: {} }),
      JSON.stringify({ certificates: [] }),
    ]) {
      writeFileSync(file, content);
      await expect(
        reportCommand({ certificates: "c.json" }, deps(root).value),
      ).rejects.toThrow(
        new Error(
          `report: ${file} is not a kibi.certificates.v1 bundle (write one with kibi check --write-certificates)`,
        ),
      );
    }
    expect(existsSync(path.join(root, "kibi-report"))).toBe(false);
  });
});

describe("reportCommand badge", () => {
  async function badgeFor(
    summary: Record<string, unknown>,
    rows: Row[] = [],
    meta?: Record<string, unknown>,
  ) {
    const root = tempDir();
    badges = [];
    const total = Number(summary.total ?? 0);
    const padded = [
      ...rows,
      ...Array(Math.max(0, total - rows.length)).fill({}),
    ];
    await reportCommand({}, deps(root, coverage(summary, padded, meta)).value);
    return badges[0];
  }

  test("colors by the tested share", async () => {
    expect(await badgeFor({ total: 10, proofTested: 10 })).toStrictEqual([
      "100% tested",
      KIBI_BRAND.success,
    ]);
    expect(await badgeFor({ total: 10, proofTested: 9 })).toStrictEqual([
      "90% tested",
      KIBI_BRAND.signal,
    ]);
    expect(await badgeFor({ total: 100, proofTested: 89 })).toStrictEqual([
      "89% tested",
      KIBI_BRAND.warning,
    ]);
    expect(await badgeFor({ total: 10, proofTested: 7 })).toStrictEqual([
      "70% tested",
      KIBI_BRAND.warning,
    ]);
    expect(await badgeFor({ total: 100, proofTested: 69 })).toStrictEqual([
      "69% tested",
      KIBI_BRAND.danger,
    ]);
    expect(await badgeFor({ total: 3, proofTested: 2 })).toStrictEqual([
      "67% tested",
      KIBI_BRAND.danger,
    ]);
    expect(await badgeFor({ total: 1 })).toStrictEqual([
      "0% tested",
      KIBI_BRAND.danger,
    ]);
  });

  test("leaves out not-applicable requirements", async () => {
    expect(
      await badgeFor({ total: 4, proofNotApplicable: 2, proofTested: 2 }),
    ).toStrictEqual(["100% tested", KIBI_BRAND.success]);
    expect(
      await badgeFor({ total: 2, proofNotApplicable: 2, proofTested: 0 }),
    ).toStrictEqual(["no requirements", KIBI_BRAND.rail]);
    expect(
      await badgeFor({ total: 1, proofNotApplicable: 3, proofTested: 0 }),
    ).toStrictEqual(["no requirements", KIBI_BRAND.rail]);
    expect(await badgeFor({})).toStrictEqual([
      "no requirements",
      KIBI_BRAND.rail,
    ]);
  });

  test("turns red on a contradiction or a requirement below its floor", async () => {
    const full = { total: 1, proofTested: 1 };
    expect(
      await badgeFor(full, [{ proofGaps: ["x", "blocking_contradiction"] }]),
    ).toStrictEqual(["100% tested", KIBI_BRAND.danger]);
    expect(
      await badgeFor(full, [{ proofGaps: "blocking_contradiction" }]),
    ).toStrictEqual(["100% tested", KIBI_BRAND.success]);
    expect(await badgeFor(full, [{ proofGaps: ["other"] }])).toStrictEqual([
      "100% tested",
      KIBI_BRAND.success,
    ]);
    expect(
      await badgeFor(full, [
        { evidenceFloor: { status: "below", required: "tested" } },
      ]),
    ).toStrictEqual(["100% tested", KIBI_BRAND.danger]);
    for (const row of [
      {
        proofStatus: "not_applicable",
        evidenceFloor: { status: "below", required: "tested" },
      },
      { evidenceFloor: null },
      { evidenceFloor: "below" },
      { evidenceFloor: { status: "met", required: "tested" } },
      { evidenceFloor: { status: "below", required: "unverified" } },
    ]) {
      expect(await badgeFor(full, [row])).toStrictEqual([
        "100% tested",
        KIBI_BRAND.success,
      ]);
    }
  });

  test("turns amber when the proof snapshot is stale", async () => {
    const full = { total: 1, proofTested: 1 };
    expect(await badgeFor(full, [], { dirty: true })).toStrictEqual([
      "100% tested",
      KIBI_BRAND.warning,
    ]);
    expect(
      await badgeFor(full, [], { proofSnapshotDirty: true }),
    ).toStrictEqual(["100% tested", KIBI_BRAND.warning]);
    expect(
      await badgeFor(full, [], { dirty: "yes", proofSnapshotDirty: 1 }),
    ).toStrictEqual(["100% tested", KIBI_BRAND.success]);
    expect(
      await badgeFor(full, [{ proofGaps: ["blocking_contradiction"] }], {
        dirty: true,
      }),
    ).toStrictEqual(["100% tested", KIBI_BRAND.danger]);
    expect(await badgeFor({ total: 0 }, [], { dirty: true })).toStrictEqual([
      "no requirements",
      KIBI_BRAND.rail,
    ]);
  });
});

describe("reportCommand repository", () => {
  test("resolves the remotes, commit and branch from Git", async () => {
    const root = tempDir();
    const execCalls: unknown[][] = [];
    const answers = [
      "  abcdef1\n",
      "ABCDEF0123456789",
      "abcdef",
      "x".repeat(7),
      "a".repeat(64),
      "a".repeat(65),
      "zabcdef1",
      "abcdef1z",
    ];
    track(
      spyOn(childProcess, "execFileSync").mockImplementation(((
        ...args: unknown[]
      ) => {
        execCalls.push(args);
        const answer = answers.shift();
        if (answer === undefined) throw new Error("not a repository");
        return answer;
      }) as never),
    );
    const remotes = [{ name: "origin", url: "git@github.com:o/r.git" }];
    const remoteCalls: unknown[] = [];
    track(
      spyOn(githubInit, "listGitRemotes").mockImplementation(((cwd: string) => {
        remoteCalls.push(cwd);
        return remotes;
      }) as never),
    );
    const resolved: unknown[] = [];
    track(
      spyOn(repository, "resolveReportRepository").mockImplementation(((
        input: unknown,
      ) => {
        resolved.push(input);
        return { provider: "resolved" };
      }) as never),
    );
    const data = coverage();
    const { repository: _repo, ...rest } = deps(root, {
      ...data,
      branch: "feat",
    }).value;
    for (let i = 0; i < 9; i++) await reportCommand({}, rest);
    expect(execCalls[0]).toStrictEqual([
      "git",
      ["-C", root, "rev-parse", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ]);
    expect(remoteCalls).toStrictEqual(Array(9).fill(root));
    const plain = { remotes, branch: "feat" };
    expect(resolved).toStrictEqual([
      { remotes, commitSha: "abcdef1", branch: "feat" },
      { remotes, commitSha: "ABCDEF0123456789", branch: "feat" },
      plain,
      plain,
      { remotes, commitSha: "a".repeat(64), branch: "feat" },
      plain,
      plain,
      plain,
      plain,
    ]);
    expect(
      (rendered as Array<{ repository: unknown }>).map((r) => r.repository),
    ).toStrictEqual(Array(9).fill({ provider: "resolved" }));
  });
});

describe("default coverage loader", () => {
  type Outcome = { status: string; result?: unknown; error?: unknown };

  function runtime(
    answers: Array<{ structuredContent?: unknown }>,
    context: Record<string, unknown> = {},
  ) {
    const executed: unknown[][] = [];
    const closed: unknown[][] = [];
    const opened: unknown[] = [];
    track(
      spyOn(coverageSpec, "execute").mockImplementation((async (
        input: unknown,
        ctx: unknown,
      ) => {
        executed.push([input, ctx]);
        const answer = answers.shift();
        if (answer === undefined) throw new Error("engine down");
        return answer;
      }) as never),
    );
    const created: unknown[][] = [];
    track(
      spyOn(cliRuntime, "createCliRuntime").mockImplementation(((
        ...args: unknown[]
      ) => {
        created.push(args);
        return {
          open: async (spec: unknown) => {
            opened.push(spec);
            return context;
          },
          close: async (ctx: unknown, outcome: Outcome) => {
            closed.push([ctx, outcome]);
          },
        };
      }) as never),
    );
    return { executed, closed, opened, created, context };
  }

  function noLoader(root: string): ReportCommandDeps {
    const { loadCoverage: _load, ...rest } = deps(root).value;
    return rest;
  }

  const req = { summary: { total: 1, proofTested: 1 }, rows: [{}] };
  const sym = { summary: { total: 0 }, rows: [] };

  test("asks for requirement rows and the symbol summary", async () => {
    const root = tempDir();
    const ctx = { branchAttachment: { gitBranch: "attached" } };
    const r = runtime(
      [{ structuredContent: req }, { structuredContent: sym }],
      ctx,
    );
    await reportCommand({ tag: "t1,t2", limit: "7" }, noLoader(root));
    expect(r.created).toStrictEqual([[]]);
    expect(r.opened).toStrictEqual([coverageSpec]);
    expect(r.executed).toStrictEqual([
      [
        {
          by: "req",
          tags: ["t1", "t2"],
          includePassing: true,
          includeTransitive: true,
          limit: 7,
          offset: 0,
        },
        ctx,
      ],
      [
        {
          by: "symbol",
          tags: ["t1", "t2"],
          includePassing: false,
          includeTransitive: true,
          limit: 0,
          offset: 0,
        },
        ctx,
      ],
    ]);
    const result = { requirements: req, symbols: sym, branch: "attached" };
    expect(r.closed).toStrictEqual([[ctx, { status: "success", result }]]);
    expect((rendered[0] as { branch: string }).branch).toBe("attached");
  });

  test("falls back to the meta branch, then unknown", async () => {
    const root = tempDir();
    runtime([
      { structuredContent: { ...req, meta: { branch: "from-meta" } } },
      { structuredContent: sym },
      { structuredContent: { ...req, meta: {} } },
      { structuredContent: sym },
      { structuredContent: req },
      { structuredContent: sym },
    ]);
    await reportCommand({}, noLoader(root));
    await reportCommand({}, noLoader(root));
    await reportCommand({}, noLoader(root));
    expect(
      (rendered as Array<{ branch: string }>).map((r) => r.branch),
    ).toStrictEqual(["from-meta", "unknown", "unknown"]);
  });

  test("closes with the error when coverage is missing", async () => {
    const root = tempDir();
    const message = "Coverage did not return structured report data";
    const r = runtime([
      {},
      { structuredContent: sym },
      { structuredContent: req },
      {},
    ]);
    await expect(reportCommand({}, noLoader(root))).rejects.toThrow(
      new Error(message),
    );
    await expect(reportCommand({}, noLoader(root))).rejects.toThrow(
      new Error(message),
    );
    await expect(reportCommand({}, noLoader(root))).rejects.toThrow(
      new Error("engine down"),
    );
    expect(
      r.closed.map(([, outcome]) => {
        const { status, error } = outcome as Outcome;
        return [status, (error as Error).message];
      }),
    ).toStrictEqual([
      ["error", message],
      ["error", message],
      ["error", "engine down"],
    ]);
    expect(rendered).toStrictEqual([]);
  });
});

describe("openReport", () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  afterEach(() => {
    if (platform) Object.defineProperty(process, "platform", platform);
  });

  function fakeSpawn(behave: (child: EventEmitter) => void) {
    const calls: unknown[][] = [];
    const unrefs: number[] = [];
    track(
      spyOn(childProcess, "spawn").mockImplementation(((...args: unknown[]) => {
        calls.push(args);
        const child = new EventEmitter() as EventEmitter & {
          unref(): void;
        };
        child.unref = () => {
          unrefs.push(1);
        };
        queueMicrotask(() => behave(child));
        return child;
      }) as never),
    );
    return { calls, unrefs };
  }

  const file = path.join(os.tmpdir(), "a b", "index.html");
  const url = pathToFileURL(file).href;

  test("uses the platform opener", async () => {
    const cases: Array<[string, string, string[]]> = [
      ["darwin", "open", [url]],
      ["win32", "rundll32", ["url.dll,FileProtocolHandler", url]],
      ["linux", "xdg-open", [url]],
      ["freebsd", "xdg-open", [url]],
    ];
    for (const [name, command, args] of cases) {
      Object.defineProperty(process, "platform", { value: name });
      const spawned = fakeSpawn((child) => child.emit("spawn"));
      await openReport(file);
      expect(spawned.calls).toStrictEqual([
        [command, args, { detached: true, stdio: "ignore" }],
      ]);
      expect(spawned.unrefs).toStrictEqual([1]);
      restores.pop()?.();
    }
  });

  test("rejects with the spawn error", async () => {
    const failure = new Error("ENOENT");
    const spawned = fakeSpawn((child) => {
      child.emit("error", failure);
    });
    await expect(openReport(file)).rejects.toBe(failure);
    expect(spawned.unrefs).toStrictEqual([]);
  });

  test("clears the timer once settled and times out otherwise", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    let fire: (() => void) | undefined;
    const delays: unknown[] = [];
    const cleared: unknown[] = [];
    track(
      spyOn(globalThis, "setTimeout").mockImplementation(((
        fn: () => void,
        delay: number,
      ) => {
        fire = fn;
        delays.push(delay);
        return 42;
      }) as never),
    );
    track(
      spyOn(globalThis, "clearTimeout").mockImplementation(((id: unknown) => {
        cleared.push(id);
      }) as never),
    );
    const ok = fakeSpawn((child) => child.emit("spawn"));
    await openReport(file);
    expect(cleared).toStrictEqual([42]);
    restores.pop()?.();
    fakeSpawn((child) => child.emit("error", new Error("x")));
    await expect(openReport(file)).rejects.toThrow("x");
    expect(cleared).toStrictEqual([42, 42]);
    restores.pop()?.();
    const hung = fakeSpawn(() => {});
    const pending = openReport(file);
    await Promise.resolve();
    fire?.();
    await expect(pending).rejects.toThrow(
      new Error("Timed out opening report via xdg-open"),
    );
    expect(hung.unrefs).toStrictEqual([1]);
    expect(delays).toStrictEqual([5000, 5000, 5000]);
    expect(ok.unrefs).toStrictEqual([1]);
  });

  test("times out even when unref throws", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    let fire: (() => void) | undefined;
    track(
      spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => {
        fire = fn;
        return 1;
      }) as never),
    );
    track(
      spyOn(childProcess, "spawn").mockImplementation((() => {
        const child = new EventEmitter() as EventEmitter & { unref(): void };
        child.unref = () => {
          throw new Error("not spawned");
        };
        return child;
      }) as never),
    );
    const pending = openReport(file);
    fire?.();
    await expect(pending).rejects.toThrow(
      new Error("Timed out opening report via open"),
    );
  });
});

describe("default repository without Git", () => {
  test("a temp directory has no commit", async () => {
    const root = tempDir();
    mkdirSync(path.join(root, "sub"));
    const resolved: unknown[] = [];
    track(
      spyOn(repository, "resolveReportRepository").mockImplementation(((
        input: unknown,
      ) => {
        resolved.push(input);
        return { provider: "unknown" };
      }) as never),
    );
    const { repository: _repo, ...rest } = deps(path.join(root, "sub")).value;
    await reportCommand({}, rest);
    expect(resolved).toStrictEqual([{ remotes: [], branch: "main" }]);
  });
});
