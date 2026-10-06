// implements REQ-docs-site-root-pages
/**
 * The animated terminal on the landing page and in the README.
 *
 * One scene per Kibi use case: an operator prompt, the agent's tool calls and
 * Kibi's verdict. The output is simplified from what Kibi reports for each
 * case (a refused contradicting upsert, a scenario-feasibility violation, a
 * passing test without a proof receipt, a staged symbol with no requirement,
 * a kb_search answer and the pre-edit hook snippet). The landing page
 * animates these scenes with the client script; the README shows the same
 * scenes as a self-animating SVG, because GitHub does not run scripts.
 */

/** How a run is colored. Proven green is reserved for complete proof. */
type TerminalTone =
  | "you"
  | "tool"
  | "name"
  | "ok"
  | "bad"
  | "warn"
  | "dim"
  | "info";

/** One terminal line: colored text runs, the pause after it, and whether it is typed. */
type TerminalLine = {
  tone: TerminalTone;
  runs: ReadonlyArray<readonly [TerminalTone, string]>;
  pauseMs: number;
  typed?: boolean;
};

type TerminalScene = { name: string; lines: readonly TerminalLine[] };

const you = (text: string, pauseMs = 400): TerminalLine => ({
  tone: "you",
  runs: [["you", `› ${text}`]],
  pauseMs,
  typed: true,
});
const call = (
  tool: string,
  rest: string,
  pauseMs: number,
  result?: readonly [TerminalTone, string],
): TerminalLine => ({
  tone: "tool",
  runs: [
    ["tool", "  "],
    ["name", tool],
    ["tool", rest ? ` ${rest}` : ""],
    ...(result ? [["tool", "  "] as const, result] : []),
  ],
  pauseMs,
});
const say = (
  tone: TerminalTone,
  text: string,
  pauseMs: number,
): TerminalLine => ({
  tone,
  runs: [[tone, text]],
  pauseMs,
});

/** Milliseconds a finished scene stays on screen before the next one starts. */
export const TERMINAL_HOLD_MS = 6500;

// implements REQ-docs-site-root-pages
export const TERMINAL_SCENES: readonly TerminalScene[] = [
  {
    name: "Contradiction",
    lines: [
      you("Sessions must expire after 30 minutes idle."),
      call("kb_upsert", "REQ-session-idle-timeout", 1200, ["info", "✓ saved"]),
      you("Remember me keeps users signed in for 30 days."),
      call("kb_upsert", "REQ-session-remember-me", 500, ["bad", "✗ refused"]),
      say("bad", "  Contradicts REQ-session-idle-timeout", 150),
      say("bad", "  session idle timeout: ≤ 30 min vs ≥ 30 days", 900),
      say("dim", "  Nothing was written. A person decides which rule wins.", 0),
    ],
  },
  {
    name: "Impossible scenario",
    lines: [
      you("Uploads are capped at 10 MB."),
      call("kb_upsert", "REQ-upload-size-limit", 1000, ["info", "✓ saved"]),
      you("Users can upload a 25 MB video."),
      call("kb_upsert", "SCEN-upload-video", 900, ["info", "✓ saved"]),
      call("kb_check", "", 700),
      say("bad", "  ✗ SCEN-upload-video can never succeed:", 150),
      say(
        "bad",
        "    it uploads 25 MB, REQ-upload-size-limit allows ≤ 10 MB",
        0,
      ),
    ],
  },
  {
    name: "Missing proof",
    lines: [
      you("Enforce the upload limit."),
      call("edit", "src/upload.ts  validateUpload()", 700),
      say("dim", "  agent: Done. TEST-upload-photo is passing.", 900),
      call("kb_check", "", 700),
      say("warn", "  ! REQ-upload-size-limit is unproven:", 150),
      say(
        "warn",
        '    "passing" is a claim; no test run backs it for this commit',
        1400,
      ),
      call("kibi prove", "--test TEST-upload-photo", 900),
      say("ok", "  ✓ REQ-upload-size-limit proven at this commit", 0),
    ],
  },
  {
    name: "Untraced code",
    lines: [
      you("Also resize photos before upload."),
      call("edit", "src/resize.ts  resizeImage()", 700),
      call("git commit", "", 300),
      say("dim", "  pre-commit: kibi check --staged", 700),
      say("bad", "  ✗ resizeImage implements no requirement", 150),
      say("bad", "  Commit blocked.", 1200),
      say("dim", "  The agent asks you why it exists, then links it.", 0),
    ],
  },
  {
    name: "Ask the KB",
    lines: [
      you("How big can uploads be? Check before you change anything."),
      call("kb_search", '"upload size limit"', 800),
      say(
        "info",
        "  REQ-upload-size-limit  Uploaded files must be at most 10 MB",
        120,
      ),
      say("dim", "    must stay true: upload file size ≤ 10 MB", 100),
      say("dim", "    implemented by: validateUpload  src/upload.ts", 100),
      say("dim", "    verified by: TEST-upload-photo", 1300),
      say(
        "dim",
        "  agent: The cap is 10 MB, and it's a requirement, not a guess.",
        0,
      ),
    ],
  },
  {
    name: "Context hook",
    lines: [
      you("Users keep getting logged out. Make sessions last longer."),
      call("edit", "src/session.ts  refreshSession()", 600),
      say("info", "  ↳ Kibi: this edit is inside refreshSession,", 100),
      say("info", "    which implements REQ-session-idle-timeout", 100),
      say("info", "    must keep true: idle timeout ≤ 30 min", 100),
      say("info", "    covered by TEST-session-idle-expiry", 1500),
      say(
        "dim",
        "  agent: That would break a security rule (≤ 30 min idle).",
        300,
      ),
      say("dim", '         Replace the rule, or add "remember me" instead?', 0),
    ],
  },
];

/** Most lines any scene shows; the terminal is sized to fit it. */
export const TERMINAL_ROWS = Math.max(
  ...TERMINAL_SCENES.map((scene) => scene.lines.length),
);

// implements REQ-docs-site-root-pages
/**
 * Landing-page markup. The first scene is rendered statically so the page
 * reads without JavaScript; the client script replays every scene.
 */
export function terminalDemoHtml(): string {
  const tabs = TERMINAL_SCENES.map(
    (scene, index) =>
      `<button type="button" class="kd-tab" data-kd-scene="${index}" aria-pressed="${index === 0}">${xml(scene.name)}</button>`,
  ).join("");
  const first = TERMINAL_SCENES[0]?.lines ?? [];
  const lines = first
    .map(
      (line) =>
        `<span class="kd-ln">${line.runs
          .map(([tone, text]) => `<span class="kd-${tone}">${xml(text)}</span>`)
          .join("")}</span>`,
    )
    .join("");
  // `<` is escaped so the JSON cannot close its script element.
  const data = JSON.stringify({
    hold: TERMINAL_HOLD_MS,
    scenes: TERMINAL_SCENES,
  }).replace(/</g, "\\u003c");
  return `<section class="kd-section" aria-label="Kibi checking an agent's work">
  <h2 class="kd-title">Watch Kibi check an agent&rsquo;s work</h2>
  <div class="kd" data-terminal-demo style="--kd-rows:${TERMINAL_ROWS}">
    <div class="kd-bar"><span class="kd-dot"></span><span class="kd-dot"></span><span class="kd-dot"></span><div class="kd-tabs">${tabs}</div></div>
    <div class="kd-screen" aria-live="off">${lines}</div>
  </div>
  <p class="kd-note">Simplified from what Kibi reports in each case.</p>
  <script type="application/json" id="kd-scenes">${data}</script>
</section>`;
}

const SVG_COLORS: Record<TerminalTone, string> = {
  you: "#a2d3f4",
  tool: "#aab8c2",
  name: "#3e8ed6",
  ok: "#63c99a",
  bad: "#f07178",
  warn: "#f2b84b",
  dim: "#aab8c2",
  info: "#a2d3f4",
};
const TYPE_MS_PER_CHAR = 38;

function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// implements REQ-docs-site-root-pages
/**
 * The README terminal: a self-contained SVG whose CSS animation steps
 * through every scene, revealing lines on the same schedule as the landing
 * page (typed prompts appear once their typing time has passed). With
 * reduced motion it shows the first scene, finished.
 */
export function terminalDemoSvg(): string {
  const width = 820;
  const lineHeight = 21;
  const top = 74;
  const height = top + TERMINAL_ROWS * lineHeight + 22;

  // Absolute start and end of every scene, and of every line within it.
  let clock = 0;
  const timeline = TERMINAL_SCENES.map((scene) => {
    const start = clock;
    const shown = scene.lines.map((line) => {
      if (line.typed) clock += line.runs[0][1].length * TYPE_MS_PER_CHAR;
      const at = clock;
      clock += line.pauseMs;
      return at;
    });
    clock += TERMINAL_HOLD_MS;
    return { scene, start, end: clock, shown };
  });
  const total = clock;
  const pct = (ms: number) => `${((ms / total) * 100).toFixed(3)}%`;

  const keyframes: string[] = [];
  const shapes: string[] = [];
  // Tabs: the active one is outlined while its scene plays.
  let tabX = 70;
  timeline.forEach(({ scene, start, end }, sceneIndex) => {
    const w = Math.round(scene.name.length * 7.2 + 18);
    keyframes.push(
      `@keyframes t${sceneIndex}{0%,${pct(start)}{opacity:0}${pct(start + 1)},${pct(end - 1)}{opacity:1}${pct(end)},100%{opacity:0}}`,
    );
    shapes.push(
      `<rect class="tab t${sceneIndex}" x="${tabX}" y="11" width="${w}" height="20" rx="5"/>`,
      `<text class="tabtext" x="${tabX + w / 2}" y="25" text-anchor="middle">${xml(scene.name)}</text>`,
    );
    tabX += w + 4;
  });
  timeline.forEach(({ scene, end, shown }, sceneIndex) => {
    scene.lines.forEach((line, lineIndex) => {
      const id = `l${sceneIndex}_${lineIndex}`;
      const at = shown[lineIndex] ?? 0;
      keyframes.push(
        `@keyframes ${id}{0%,${pct(at)}{opacity:0}${pct(at + 1)},${pct(end - 1)}{opacity:1}${pct(end)},100%{opacity:0}}`,
      );
      const spans = line.runs
        .filter(([, text]) => text.length > 0)
        .map(
          ([tone, text]) =>
            `<tspan fill="${SVG_COLORS[tone]}"${tone === "name" ? ' font-weight="600"' : ""}>${xml(text)}</tspan>`,
        )
        .join("");
      shapes.push(
        `<text class="ln s${sceneIndex}" style="animation-name:${id}" x="18" y="${top + lineIndex * lineHeight}" xml:space="preserve">${spans}</text>`,
      );
    });
  });

  const css = [
    `.ln,.tab{opacity:0;animation-duration:${total}ms;animation-iteration-count:infinite;animation-timing-function:step-end}`,
    ...TERMINAL_SCENES.map(
      (_, index) => `.t${index}{animation-name:t${index}}`,
    ),
    ".ln{font:13px ui-monospace,'SF Mono','Cascadia Code',Menlo,Consolas,'Liberation Mono',monospace;white-space:pre}",
    ".tab{fill:none;stroke:#a2d3f4;stroke-opacity:.5}",
    ".tabtext{font:600 11.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;fill:#aab8c2}",
    ...keyframes,
    "@media (prefers-reduced-motion:reduce){.ln,.tab{animation:none!important}.s0,.t0{opacity:1}}",
  ].join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Animated terminal: Kibi refuses a contradicting requirement, flags an impossible scenario, an unproven requirement and untraced code, answers a knowledge-base search, and reminds the agent of a requirement before an edit">
<style>
${css}
</style>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="#191c22" stroke="#34434f"/>
<path d="M0.5 42V10.5a10 10 0 0 1 10-10h${width - 21}a10 10 0 0 1 10 10V42z" fill="#1d1e23"/>
<line x1="0" y1="42" x2="${width}" y2="42" stroke="#34434f"/>
<circle cx="20" cy="21" r="4.5" fill="#34434f"/><circle cx="35" cy="21" r="4.5" fill="#34434f"/><circle cx="50" cy="21" r="4.5" fill="#34434f"/>
${shapes.join("\n")}
</svg>
`;
}

/** Committed copy of the README terminal, regenerated with `bun run docs:terminal-demo`. */
export const TERMINAL_SVG_PATH = "assets/terminal-demo.svg";

if (import.meta.main) {
  const { writeFileSync } = await import("node:fs");
  const path = await import("node:path");
  const out = path.resolve(import.meta.dir, "..", TERMINAL_SVG_PATH);
  writeFileSync(out, terminalDemoSvg());
  console.log(`Wrote ${TERMINAL_SVG_PATH}`);
}
