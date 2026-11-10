// implements REQ-kibi-signoff-views
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import {
  SIGNOFF_FORMAT_ENV,
  defaultSignoffFormat,
  signoffCommand,
} from "../../src/commands/signoff.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import { earliestUnmetGate } from "../../src/report/html-report.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import * as collect from "../../src/signoff/collect.js";
import * as html from "../../src/signoff/html.js";
import * as markdown from "../../src/signoff/markdown.js";
import {
  SIGNOFF_LATEST_HTML,
  SIGNOFF_LATEST_JSON,
  SIGNOFF_LATEST_MARKDOWN,
  type SignoffProof,
} from "../../src/signoff/model.js";
import {
  createTempDir,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
let lastClosed: unknown[] = [];
let root: string;
let summaries: unknown[][] = [];
let questions: unknown[][] = [];
let parsed: unknown[] = [];
const summary = { kind: "summary", id: "S" };
const asked = { kind: "questions", id: "Q" };

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

beforeEach(() => {
  root = createTempDir("kibi-signoff-mut-");
  summaries = [];
  questions = [];
  parsed = [];
  track(
    spyOn(collect, "collectSignoffSummary").mockImplementation((async (
      ...args: unknown[]
    ) => {
      summaries.push(args);
      return summary;
    }) as never),
  );
  track(
    spyOn(collect, "collectSignoffQuestions").mockImplementation(((
      ...args: unknown[]
    ) => {
      questions.push(args);
      return asked;
    }) as never),
  );
  track(
    spyOn(collect, "parseSignoffQuestionsInput").mockImplementation(((
      input: unknown,
    ) => {
      parsed.push(input);
      return { parsed: input };
    }) as never),
  );
  track(
    spyOn(html, "renderSignoffHtml").mockImplementation(
      ((view: { id: string }) => `<html ${view.id}>`) as never,
    ),
  );
  track(
    spyOn(markdown, "renderSignoffMarkdown").mockImplementation(
      ((view: { id: string }) => `md ${view.id}`) as never,
    ),
  );
  track(
    spyOn(markdown, "renderSignoffChatMarkdown").mockImplementation(
      ((view: { id: string }) => `chat ${view.id}`) as never,
    ),
  );
  track(
    spyOn(markdown, "renderSummaryMarkdownBody").mockImplementation(
      ((view: { id: string }, limit: number) =>
        `summary ${view.id} ${limit}`) as never,
    ),
  );
  track(
    spyOn(markdown, "renderQuestionsMarkdownBody").mockImplementation(
      ((view: { id: string }) => `questions ${view.id}`) as never,
    ),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  removeTempDir(root);
});

function run(
  options: Parameters<typeof signoffCommand>[0],
  deps: Parameters<typeof signoffCommand>[1] = {},
) {
  const written: string[] = [];
  const notes: string[] = [];
  const result = signoffCommand(options, {
    cwd: () => root,
    write: (text) => written.push(text),
    writeNote: (text) => notes.push(text),
    ...deps,
  });
  return { result, written, notes };
}

const latest = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("defaultSignoffFormat", () => {
  test("reads a known format from the environment", () => {
    expect(defaultSignoffFormat({})).toBe("chat");
    expect(defaultSignoffFormat({ [SIGNOFF_FORMAT_ENV]: "  MD " })).toBe("md");
    expect(defaultSignoffFormat({ [SIGNOFF_FORMAT_ENV]: "pdf" })).toBe("chat");
    expect(defaultSignoffFormat({ [SIGNOFF_FORMAT_ENV]: "" })).toBe("chat");
    expect(SIGNOFF_FORMAT_ENV).toBe("KIBI_SIGNOFF_FORMAT");
  });
});

describe("signoffCommand", () => {
  test("refuses an unknown format", async () => {
    await expect(run({ format: "pdf" }).result).rejects.toThrow(
      new Error('Unknown signoff format "pdf": use chat, md, html or json'),
    );
    expect(summaries).toStrictEqual([]);
  });

  test("prints JSON and keeps the latest views", async () => {
    const now = () => new Date(0);
    const git = () => "";
    const loadAffected = async () => new Map();
    const loadProof = async () => new Map();
    const { result, written } = run(
      { format: " JSON ", staged: true },
      { now, git, loadAffected, loadProof },
    );
    expect(await result).toBe(summary as never);
    expect(summaries).toStrictEqual([
      [root, "staged", { git, loadAffected, now, loadProof }],
    ]);
    expect(written).toStrictEqual([`${JSON.stringify(summary, null, 2)}\n`]);
    expect(latest(SIGNOFF_LATEST_JSON)).toBe(
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    expect(latest(SIGNOFF_LATEST_MARKDOWN)).toBe("summary S Infinity\n");
    expect(latest(SIGNOFF_LATEST_HTML)).toBe("<html S>");
    expect(
      readdirSync(path.dirname(path.join(root, SIGNOFF_LATEST_JSON))).sort(),
    ).toStrictEqual(["latest.html", "latest.json", "latest.md"]);
  });

  test("prints fenced Markdown for the working tree without proof", async () => {
    const { result, written } = run({ format: "md", proof: false });
    await result;
    expect(summaries).toStrictEqual([[root, "working", {}]]);
    expect(written).toStrictEqual(["md S"]);
  });

  test("loads proof by default", async () => {
    await run({ format: "md" }).result;
    await run({ format: "md", proof: true }).result;
    for (const [, , deps] of summaries)
      expect(typeof (deps as { loadProof?: unknown }).loadProof).toBe(
        "function",
      );
    expect(Object.keys(summaries[0]?.[2] as object)).toStrictEqual([
      "loadProof",
    ]);
  });

  test("prints chat Markdown and names the page on the note stream", async () => {
    const { result, written, notes } = run({}, { env: {} });
    await result;
    expect(written).toStrictEqual(["chat S\n"]);
    expect(notes).toStrictEqual([
      `Kibi signoff page: ${path.join(root, SIGNOFF_LATEST_HTML)} (publish it as a rendered page, such as a Claude Artifact, when the host has a page tool; an attached .html file shows as raw source in chat apps)\n`,
    ]);
  });

  test("defaults the format from the given environment", async () => {
    const { result, written } = run(
      {},
      { env: { [SIGNOFF_FORMAT_ENV]: "md" } },
    );
    await result;
    expect(written).toStrictEqual(["md S"]);
  });

  test("writes the HTML page where asked and opens it", async () => {
    const opened: string[] = [];
    const renames = track(spyOn(fsp, "rename"));
    const { result, written } = run(
      { format: "html", output: "  out/page.html  ", open: true },
      { openReport: async (file) => void opened.push(file) },
    );
    await result;
    const target = path.join(root, "out", "page.html");
    expect(readFileSync(target, "utf8")).toBe("<html S>");
    expect(written).toStrictEqual([
      `Kibi signoff page written to ${target}\n`,
      "Opened the signoff page in the default browser\n",
    ]);
    expect(opened).toStrictEqual([target]);
    expect(renames.mock.calls).toHaveLength(4);
  });

  test("points at the latest page without rewriting it", async () => {
    const opened: string[] = [];
    const renames = track(spyOn(fsp, "rename"));
    for (const output of [undefined, "   "]) {
      const { result, written } = run(
        { format: "html", ...(output === undefined ? {} : { output }) },
        { openReport: async (file) => void opened.push(file) },
      );
      await result;
      expect(written).toStrictEqual([
        `Kibi signoff page written to ${path.join(root, SIGNOFF_LATEST_HTML)}\n`,
      ]);
    }
    const { result } = run(
      { format: "html", output: SIGNOFF_LATEST_HTML, open: false },
      { openReport: async (file) => void opened.push(file) },
    );
    await result;
    expect(renames.mock.calls).toHaveLength(9);
    expect(opened).toStrictEqual([]);
  });

  test("asks the questions from a file or standard input", async () => {
    writeFileSync(path.join(root, "q.json"), "from file");
    const now = () => new Date(1);
    const { result, written } = run(
      { format: "md", questions: "q.json" },
      { now, readStdin: () => "unused" },
    );
    expect(await result).toBe(asked as never);
    expect(parsed).toStrictEqual(["from file"]);
    expect(questions).toStrictEqual([[root, { parsed: "from file" }, now]]);
    expect(written).toStrictEqual(["md Q"]);
    expect(latest(SIGNOFF_LATEST_MARKDOWN)).toBe("questions Q\n");
    await run({ format: "md", questions: "-" }, { readStdin: () => "piped" })
      .result;
    expect(parsed).toStrictEqual(["from file", "piped"]);
  });

  test("defaults to the process directory, output streams and stdin", async () => {
    const out: string[] = [];
    const err: string[] = [];
    track(
      spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
        out.push(chunk);
        return true;
      }) as never),
    );
    track(
      spyOn(process.stderr, "write").mockImplementation(((chunk: string) => {
        err.push(chunk);
        return true;
      }) as never),
    );
    const realRead = fs.readFileSync;
    track(
      spyOn(fs, "readFileSync").mockImplementation(((
        file: unknown,
        ...rest: unknown[]
      ) =>
        file === 0
          ? rest[0] === "utf8"
            ? "stdin text"
            : Buffer.from("stdin text")
          : (realRead as (...args: unknown[]) => unknown)(
              file,
              ...rest,
            )) as never),
    );
    await withCwd(root, () => signoffCommand({ questions: "-" }, { env: {} }));
    expect(parsed).toStrictEqual(["stdin text"]);
    expect(out).toStrictEqual(["chat Q\n"]);
    expect(err).toHaveLength(1);
    expect(
      err[0]?.startsWith(
        `Kibi signoff page: ${path.join(root, SIGNOFF_LATEST_HTML)} (publish`,
      ),
    ).toBe(true);
    expect(existsSync(path.join(root, SIGNOFF_LATEST_JSON))).toBe(true);
  });

  test("removes the temporary file and keeps the error when a write fails", async () => {
    track(spyOn(crypto, "randomUUID").mockReturnValue("fixed-id" as never));
    track(
      spyOn(fsp, "writeFile").mockImplementation((async () => {
        throw new Error("disk full");
      }) as never),
    );
    await expect(run({ format: "json" }).result).rejects.toThrow(
      new Error("disk full"),
    );
    expect(
      existsSync(
        path.join(
          path.dirname(path.join(root, SIGNOFF_LATEST_JSON)),
          ".latest.json.fixed-id.tmp",
        ),
      ),
    ).toBe(false);
  });
});

describe("default proof loading", () => {
  async function loadProofWith(
    execute: (input: unknown) => Promise<unknown>,
  ): Promise<{
    proof: ReadonlyMap<string, SignoffProof>;
    closed: unknown[];
    inputs: unknown[];
  }> {
    const closed: unknown[] = [];
    lastClosed = closed;
    const inputs: unknown[] = [];
    const contexts: unknown[] = [];
    const context = { ctx: true };
    track(
      spyOn(cliRuntime, "createCliRuntime").mockImplementation((() => ({
        open: async (spec: unknown) => {
          contexts.push(spec);
          return context;
        },
        close: async (ctx: unknown, outcome: unknown) => {
          expect(ctx).toBe(context);
          closed.push(outcome);
        },
      })) as never),
    );
    track(
      spyOn(coverageSpec, "execute").mockImplementation((async (
        input: unknown,
        ctx: unknown,
      ) => {
        expect(ctx).toBe(context);
        inputs.push(input);
        return execute(input);
      }) as never),
    );
    await run({ format: "md" }).result;
    const loadProof = (
      summaries.at(-1)?.[2] as {
        loadProof: () => Promise<ReadonlyMap<string, SignoffProof>>;
      }
    ).loadProof;
    const proof = await loadProof();
    expect(contexts).toStrictEqual([coverageSpec]);
    return { proof, closed, inputs };
  }

  test("maps each coverage row to its proof state", async () => {
    const rows = [
      { id: 7 },
      {
        id: "REQ-A",
        proofStatus: "tested",
        testCount: 2,
        evidenceLevel: "proved",
        evidenceFloor: { required: "tested", status: "met" },
        certificateRejections: [{ test: "TEST-A", reason: "stale" }],
        proofStages: {
          contradictions: {
            conflicts: [
              { status: "contradiction", reason: "Clashes." },
              { status: "contradiction", reason: 3 },
              { status: "consistent", reason: "fine" },
              null,
            ],
          },
        },
      },
      {
        id: "REQ-B",
        evidenceFloor: {
          required: "proved",
          source: "priority",
          status: "below",
        },
      },
      { id: "REQ-C", evidenceFloor: { required: "unverified", status: "met" } },
      { id: "REQ-D", evidenceFloor: { required: 1, status: "met" } },
      { id: "REQ-E", evidenceFloor: { required: "tested", status: 2 } },
      {
        id: "REQ-F",
        evidenceFloor: null,
        proofStages: null,
        testCount: "2",
        proofStatus: 1,
        evidenceLevel: 1,
      },
      {
        id: "REQ-G",
        evidenceFloor: "tested",
        proofStages: { contradictions: "x" },
      },
    ];
    const { proof, closed, inputs } = await loadProofWith(async () => ({
      content: [],
      structuredContent: { rows },
    }));
    expect(inputs).toStrictEqual([
      {
        by: "req",
        tags: [],
        includePassing: true,
        includeTransitive: true,
        limit: 100_000,
        offset: 0,
      },
    ]);
    expect(closed).toStrictEqual([{ status: "success", result: 8 }]);
    const plain = (row: Record<string, unknown>) => ({
      status: "missing",
      gate: earliestUnmetGate(row),
      testCount: 0,
      contradictions: [],
    });
    expect(proof).toStrictEqual(
      new Map<string, unknown>([
        [
          "REQ-A",
          {
            status: "tested",
            gate: "tested",
            testCount: 2,
            evidenceLevel: "proved",
            evidenceFloor: {
              required: "tested",
              source: "explicit",
              status: "met",
            },
            certificateRejections: ["TEST-A: certificate rejected, stale"],
            contradictions: [
              "Clashes.",
              "Two current requirements encode incompatible claims.",
            ],
          },
        ],
        [
          "REQ-B",
          {
            ...plain(rows[2] as never),
            evidenceFloor: {
              required: "proved",
              source: "priority",
              status: "below",
            },
          },
        ],
        ["REQ-C", plain(rows[3] as never)],
        ["REQ-D", plain(rows[4] as never)],
        ["REQ-E", plain(rows[5] as never)],
        ["REQ-F", plain(rows[6] as never)],
        ["REQ-G", plain(rows[7] as never)],
      ]) as never,
    );
  });

  test("reads a report without rows as no proof state", async () => {
    const { proof, closed } = await loadProofWith(async () => ({
      content: [],
    }));
    expect(proof).toStrictEqual(new Map());
    expect(closed).toStrictEqual([{ status: "success", result: 0 }]);
  });

  test("closes with the error when coverage fails", async () => {
    const failure = new Error("coverage down");
    await expect(
      loadProofWith(async () => {
        throw failure;
      }),
    ).rejects.toThrow(failure);
    expect(lastClosed).toStrictEqual([{ status: "error", error: failure }]);
  });
});
