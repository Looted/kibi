import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RuntimeOperationSpec } from "../public/operations/runtime-types.js";
import { coverageSpec } from "../public/operations/specs/reporting.js";
import { earliestUnmetGate } from "../report/html-report.js";
import {
  type SignoffCollectDeps,
  type SignoffScope,
  collectSignoffQuestions,
  collectSignoffSummary,
  parseSignoffQuestionsInput,
} from "../signoff/collect.js";
import { renderSignoffHtml } from "../signoff/html.js";
import {
  renderQuestionsMarkdownBody,
  renderSignoffChatMarkdown,
  renderSignoffMarkdown,
  renderSummaryMarkdownBody,
} from "../signoff/markdown.js";
import {
  SIGNOFF_LATEST_HTML,
  SIGNOFF_LATEST_JSON,
  SIGNOFF_LATEST_MARKDOWN,
  type SignoffProof,
  type SignoffView,
} from "../signoff/model.js";
import { openReport } from "./report.js";

export type SignoffOptions = Readonly<{
  staged?: boolean;
  questions?: string;
  format?: string;
  output?: string;
  open?: boolean;
  proof?: boolean;
}>;

// implements REQ-kibi-signoff-views
export type SignoffCommandDeps = SignoffCollectDeps &
  Readonly<{
    cwd?: () => string;
    readStdin?: () => string;
    write?: (text: string) => void;
    writeNote?: (text: string) => void;
    env?: NodeJS.ProcessEnv;
    openReport?: (filePath: string) => Promise<void>;
  }>;

const FORMATS = new Set(["chat", "md", "html", "json"]);

// implements REQ-kibi-signoff-views
/** Sets the default signoff format for a host (`chat`, `md`, `html`, `json`). */
export const SIGNOFF_FORMAT_ENV = "KIBI_SIGNOFF_FORMAT";

// implements REQ-kibi-signoff-views
/**
 * The format `kibi signoff` prints when `--format` is not given. A fenced
 * block only helps where a host renderer draws it (the OpenCode TUI, which
 * sets KIBI_SIGNOFF_FORMAT=md for its shell); every other host renders
 * assistant or message Markdown directly and shows a fence as code, so the
 * default is the unfenced `chat` Markdown.
 */
export function defaultSignoffFormat(env: NodeJS.ProcessEnv): string {
  const configured = env[SIGNOFF_FORMAT_ENV]?.trim().toLowerCase();
  return configured && FORMATS.has(configured) ? configured : "chat";
}

async function writeAtomically(filePath: string, contents: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, contents, "utf8");
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Proof state per requirement from the requirement coverage report. */
async function loadProof(): Promise<ReadonlyMap<string, SignoffProof>> {
  const { createCliRuntime } = await import("../runtime/cli-runtime.js");
  const runtime = createCliRuntime();
  const spec = coverageSpec as RuntimeOperationSpec<unknown, unknown>;
  const context = await runtime.open(spec);
  let rows: readonly Record<string, unknown>[] = [];
  try {
    const result = await coverageSpec.execute(
      {
        by: "req",
        tags: [],
        includePassing: true,
        includeTransitive: true,
        limit: 100_000,
        offset: 0,
      },
      context,
    );
    rows = (result.structuredContent?.rows ?? []) as readonly Record<
      string,
      unknown
    >[];
  } catch (error) {
    await runtime.close(context, { status: "error", error });
    throw error;
  }
  await runtime.close(context, { status: "success", result: rows.length });
  const proof = new Map<string, SignoffProof>();
  for (const row of rows) {
    if (typeof row.id !== "string") continue;
    const conflicts = (record(record(row.proofStages).contradictions)
      .conflicts ?? []) as unknown[];
    proof.set(row.id, {
      status: typeof row.proofStatus === "string" ? row.proofStatus : "missing",
      gate: earliestUnmetGate(row),
      testCount: typeof row.testCount === "number" ? row.testCount : 0,
      ...(typeof row.evidenceLevel === "string"
        ? { evidenceLevel: row.evidenceLevel }
        : {}),
      contradictions: conflicts
        .map(record)
        .filter((conflict) => conflict.status === "contradiction")
        .map((conflict) =>
          typeof conflict.reason === "string"
            ? conflict.reason
            : "Two current requirements encode incompatible claims.",
        ),
    });
  }
  return proof;
}

function readQuestionsSource(
  source: string,
  cwd: string,
  readStdin: () => string,
): string {
  return source === "-"
    ? readStdin()
    : readFileSync(path.resolve(cwd, source), "utf8");
}

// implements REQ-kibi-signoff-views
/**
 * `kibi signoff`: print the requirements signoff view for the current change
 * (or, with `--questions`, the decisions the agent asks the person to
 * confirm) as chat Markdown, a fenced Markdown block, HTML or JSON, and keep the latest view
 * in `.kb/briefs/signoff/` (latest.json, latest.md, latest.html) for editor
 * plugins.
 */
export async function signoffCommand(
  options: SignoffOptions,
  deps: SignoffCommandDeps = {},
): Promise<SignoffView> {
  const format = (
    options.format ?? defaultSignoffFormat(deps.env ?? process.env)
  )
    .trim()
    .toLowerCase();
  if (!FORMATS.has(format)) {
    throw new Error(
      `Unknown signoff format "${options.format}": use chat, md, html or json`,
    );
  }
  const cwd = (deps.cwd ?? (() => process.cwd()))();
  const write = deps.write ?? ((text: string) => process.stdout.write(text));
  const scope: SignoffScope = options.staged ? "staged" : "working";

  const view: SignoffView =
    options.questions !== undefined
      ? collectSignoffQuestions(
          cwd,
          parseSignoffQuestionsInput(
            readQuestionsSource(
              options.questions,
              cwd,
              deps.readStdin ?? (() => readFileSync(0, "utf8")),
            ),
          ),
          deps.now,
        )
      : await collectSignoffSummary(cwd, scope, {
          ...(deps.git ? { git: deps.git } : {}),
          ...(deps.loadAffected ? { loadAffected: deps.loadAffected } : {}),
          ...(deps.now ? { now: deps.now } : {}),
          ...(options.proof === false
            ? {}
            : { loadProof: deps.loadProof ?? loadProof }),
        });

  const html = renderSignoffHtml(view);
  await writeAtomically(
    path.join(cwd, SIGNOFF_LATEST_JSON),
    `${JSON.stringify(view, null, 2)}\n`,
  );
  await writeAtomically(
    path.join(cwd, SIGNOFF_LATEST_MARKDOWN),
    `${
      view.kind === "summary"
        ? renderSummaryMarkdownBody(view, Number.POSITIVE_INFINITY)
        : renderQuestionsMarkdownBody(view)
    }\n`,
  );
  await writeAtomically(path.join(cwd, SIGNOFF_LATEST_HTML), html);

  if (format === "json") {
    write(`${JSON.stringify(view, null, 2)}\n`);
  } else if (format === "md") {
    write(renderSignoffMarkdown(view));
  } else if (format === "chat") {
    write(`${renderSignoffChatMarkdown(view)}\n`);
    // The page path goes to stderr so stdout stays pasteable as the reply.
    (deps.writeNote ?? ((text: string) => process.stderr.write(text)))(
      `Kibi signoff page: ${path.join(cwd, SIGNOFF_LATEST_HTML)} (attach or publish it next to the reply when the host can show a page)\n`,
    );
  } else {
    const target = options.output?.trim()
      ? path.resolve(cwd, options.output.trim())
      : path.join(cwd, SIGNOFF_LATEST_HTML);
    if (target !== path.join(cwd, SIGNOFF_LATEST_HTML)) {
      await writeAtomically(target, html);
    }
    write(`Kibi signoff page written to ${target}\n`);
    if (options.open === true) {
      await (deps.openReport ?? openReport)(target);
      write("Opened the signoff page in the default browser\n");
    }
  }
  return view;
}
