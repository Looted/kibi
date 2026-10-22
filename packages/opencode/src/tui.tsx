import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import {
  BoxRenderable,
  MarkdownRenderable,
  type RenderContext,
  type Renderable,
} from "@opentui/core";

// The TUI half of kibi-opencode renders Kibi's requirement signoff views; all
// other behaviour lives in the server plugin. The default export carries both
// shapes:
// - OpenCode v1 reads `{ id, tui }` and calls `tui(api, options, meta)`.
// - OpenCode v2 resolves the `./tui` entry and requires `{ id, setup }`;
//   it rejects `{ id, tui }` with "Invalid V2 TUI plugin module".
//
// Agents paste `kibi signoff` output as a fenced block (```kibi-signoff for
// the end-of-work summary, ```kibi-questions for decisions waiting for the
// person). On v2 the fences render as a framed Markdown card instead of raw
// code, `/kibi-signoff` shows the latest view, and a toast announces a new one.

export const SIGNOFF_FENCES = ["kibi-signoff", "kibi-questions"] as const;
export const SIGNOFF_DIR = path.join(".kb", "briefs", "signoff");
const POLL_MS = 3000;

type SignoffLatest = Readonly<{
  kind: "summary" | "questions";
  count: number;
  open: number;
  markdown: string;
}>;

// implements REQ-kibi-signoff-views
/** Read the latest signoff view `kibi signoff` wrote for this workspace. */
export function readLatestSignoff(root: string): SignoffLatest | undefined {
  const directory = path.join(root, SIGNOFF_DIR);
  try {
    const view = JSON.parse(
      readFileSync(path.join(directory, "latest.json"), "utf8"),
    ) as {
      kind?: unknown;
      requirements?: unknown;
      questions?: unknown;
    };
    const markdown = existsSync(path.join(directory, "latest.md"))
      ? readFileSync(path.join(directory, "latest.md"), "utf8")
      : "";
    if (view.kind === "questions" && Array.isArray(view.questions)) {
      const open = view.questions.filter(
        (question) =>
          typeof (question as { answer?: unknown }).answer !== "string" ||
          (question as { answer: string }).answer.trim() === "",
      ).length;
      return {
        kind: "questions",
        count: view.questions.length,
        open,
        markdown,
      };
    }
    if (view.kind === "summary" && Array.isArray(view.requirements)) {
      return {
        kind: "summary",
        count: view.requirements.length,
        open: 0,
        markdown,
      };
    }
  } catch {
    // No view yet, or one being rewritten: nothing to show.
  }
  return undefined;
}

// implements REQ-kibi-signoff-views
/** The toast that announces a new signoff view. */
export function signoffToast(latest: SignoffLatest): {
  title: string;
  message: string;
  variant: "info" | "warning";
} {
  if (latest.kind === "questions") {
    return {
      title: "Kibi decisions",
      message:
        latest.open > 0
          ? `${latest.open} ${latest.open === 1 ? "decision waits" : "decisions wait"} for your answer. Type /kibi-signoff to read ${latest.open === 1 ? "it" : "them"}.`
          : "Every decision is answered.",
      variant: latest.open > 0 ? "warning" : "info",
    };
  }
  return {
    title: "Kibi signoff",
    message: `Signoff summary ready: ${latest.count} ${latest.count === 1 ? "requirement" : "requirements"}. Type /kibi-signoff to read it.`,
    variant: "info",
  };
}

function signoffMtime(root: string): number {
  try {
    return statSync(path.join(root, SIGNOFF_DIR, "latest.json")).mtimeMs;
  } catch {
    return 0;
  }
}

// implements REQ-kibi-signoff-views
/**
 * Call `onChange` whenever `kibi signoff` writes a new view. Polls the file's
 * mtime (the directory may not exist yet, so fs.watch cannot be armed).
 */
export function watchSignoff(
  root: string,
  onChange: (latest: SignoffLatest) => void,
  interval = POLL_MS,
): () => void {
  let seen = signoffMtime(root);
  const timer = setInterval(() => {
    const mtime = signoffMtime(root);
    if (mtime === 0 || mtime === seen) return;
    seen = mtime;
    const latest = readLatestSignoff(root);
    if (latest) onChange(latest);
  }, interval);
  timer.unref?.();
  return () => clearInterval(timer);
}

type CodeToken = Readonly<{ text: string; lang?: string }>;
type NodeContext = Readonly<{
  syntaxStyle: unknown;
  conceal: boolean;
}>;

// implements REQ-kibi-signoff-views
/**
 * Render a signoff fence as a framed Markdown card: the fence body is
 * Markdown, so it shows as headings, quotes and lists rather than code.
 */
export function renderSignoffBlock(
  renderer: RenderContext,
  token: CodeToken,
  node: NodeContext,
): Renderable {
  const card = new BoxRenderable(renderer, {
    border: true,
    borderStyle: "rounded",
    title:
      token.lang === "kibi-questions" ? " Kibi decisions " : " Kibi signoff ",
    flexDirection: "column",
    paddingLeft: 1,
    paddingRight: 1,
  });
  card.add(
    new MarkdownRenderable(renderer, {
      content: token.text,
      syntaxStyle: node.syntaxStyle as never,
      conceal: node.conceal,
    }),
  );
  return card;
}

/** The parts of the OpenCode v2 TUI context this plugin uses. */
type V2TuiContext = Readonly<{
  renderer: RenderContext;
  markdown?: {
    registerCodeBlockRenderer(
      language: string,
      render: (token: CodeToken, node: NodeContext) => Renderable | undefined,
    ): () => void;
  };
  keymap?: {
    layer(
      factory: () => {
        mode?: string;
        commands?: readonly {
          id?: string;
          title?: string;
          description?: string;
          group?: string;
          palette?: true;
          slash?: { name: string; aliases?: string[] };
          run: () => void | false | Promise<void>;
        }[];
      },
    ): void;
  };
  ui?: {
    toast?: {
      show(options: {
        title?: string;
        message: string;
        variant?: "info" | "warning";
      }): void;
    };
    dialog?: {
      alert(options: { title: string; message: string }): Promise<void>;
    };
  };
}>;

// implements REQ-kibi-signoff-views
export const tui: TuiPlugin = async (api, _options, _meta) => {
  const root = process.cwd();
  const stop = watchSignoff(root, (latest) => {
    api.ui.toast(signoffToast(latest));
  });
  api.lifecycle?.onDispose?.(stop);
};

/** OpenCode v2 TUI setup: signoff fence renderers, /kibi-signoff and toasts. */
// implements REQ-opencode-v2-plugin-api, REQ-kibi-signoff-views
export const setup = (context: unknown): (() => void) => {
  const ctx = context as V2TuiContext;
  const root = process.cwd();
  const cleanups: (() => void)[] = [];
  for (const fence of SIGNOFF_FENCES) {
    const unregister = ctx.markdown?.registerCodeBlockRenderer(
      fence,
      (token, node) => renderSignoffBlock(ctx.renderer, token, node),
    );
    if (unregister) cleanups.push(unregister);
  }
  ctx.keymap?.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "kibi.signoff.show",
        title: "Kibi: show requirements signoff",
        description:
          "Show the latest requirements signoff summary or the decisions waiting for you",
        group: "Kibi",
        palette: true,
        slash: { name: "kibi-signoff" },
        run: async () => {
          const latest = readLatestSignoff(root);
          await ctx.ui?.dialog?.alert({
            title:
              latest?.kind === "questions"
                ? "Kibi decisions"
                : "Kibi requirements signoff",
            message:
              latest?.markdown.trim() ||
              "No signoff view yet. The agent writes one with kibi signoff.",
          });
        },
      },
    ],
  }));
  cleanups.push(
    watchSignoff(root, (latest) => ctx.ui?.toast?.show(signoffToast(latest))),
  );
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
};

export default {
  id: "kibi-opencode",
  tui,
  setup,
} as const;
