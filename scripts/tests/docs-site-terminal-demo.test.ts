import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  TERMINAL_HOLD_MS,
  TERMINAL_ROWS,
  TERMINAL_SCENES,
  TERMINAL_SVG_PATH,
  terminalDemoHtml,
  terminalDemoSvg,
  writeTerminalDemoSvg,
} from "../../docs-site/terminal-demo";

const ROOT = path.join(import.meta.dir, "..", "..");
const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("docs-site terminal demo", () => {
  test("every scene has lines and the screen fits the longest scene", () => {
    expect(TERMINAL_SCENES.map((scene) => scene.name)).toStrictEqual([
      "Contradiction",
      "Impossible scenario",
      "Missing proof",
      "Untraced code",
      "Ask the KB",
      "Context hook",
    ]);
    expect(TERMINAL_ROWS).toBe(
      Math.max(...TERMINAL_SCENES.map((scene) => scene.lines.length)),
    );
    const [first] = TERMINAL_SCENES;
    expect(first?.lines[0]).toStrictEqual({
      tone: "you",
      runs: [["you", "› Sessions must expire after 30 minutes idle."]],
      pauseMs: 400,
      typed: true,
    });
    expect(first?.lines[1]).toStrictEqual({
      tone: "tool",
      runs: [
        ["tool", "  "],
        ["name", "kb_upsert"],
        ["tool", " REQ-session-idle-timeout"],
        ["tool", "  "],
        ["info", "✓ saved"],
      ],
      pauseMs: 1200,
    });
    const check = TERMINAL_SCENES[1]?.lines.find(
      (line) => line.runs[1]?.[1] === "kb_check",
    );
    expect(check?.runs).toStrictEqual([
      ["tool", "  "],
      ["name", "kb_check"],
      ["tool", ""],
    ]);
  });

  test("the landing page markup shows the first scene and embeds every scene", () => {
    const html = terminalDemoHtml();
    const tabs = [
      ...html.matchAll(/data-kd-scene="(\d+)" aria-pressed="(\w+)">([^<]+)</g),
    ];
    expect(tabs.map((match) => [match[1], match[2], match[3]])).toStrictEqual(
      TERMINAL_SCENES.map((scene, index) => [
        String(index),
        String(index === 0),
        scene.name,
      ]),
    );
    expect(html).toContain(`style="--kd-rows:${TERMINAL_ROWS}"`);
    expect(html).toContain(
      '<span class="kd-ln"><span class="kd-you">› Sessions must expire after 30 minutes idle.</span></span>',
    );
    const json =
      /<script type="application\/json" id="kd-scenes">([^]*?)<\/script>/.exec(
        html,
      )?.[1];
    expect(json).not.toContain("<");
    expect(JSON.parse(json ?? "")).toStrictEqual(
      JSON.parse(
        JSON.stringify({ hold: TERMINAL_HOLD_MS, scenes: TERMINAL_SCENES }),
      ),
    );
  });

  test("the README SVG matches the committed copy and escapes markup", () => {
    const svg = terminalDemoSvg();
    expect(readFileSync(path.join(ROOT, TERMINAL_SVG_PATH), "utf8")).toBe(svg);
    expect(svg).toContain("&quot;upload size limit&quot;");
    expect(svg).toContain(' font-weight="600"');
    expect(svg).toContain("Ask the KB</text>");
  });

  test("writes the SVG under the given repository root", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-terminal-demo-"));
    created.push(root);
    mkdirSync(path.join(root, "assets"));
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const out = await writeTerminalDemoSvg(root);
      expect(out).toBe(path.join(root, TERMINAL_SVG_PATH));
      expect(readFileSync(out, "utf8")).toBe(terminalDemoSvg());
      expect(log).toHaveBeenCalledWith(`Wrote ${TERMINAL_SVG_PATH}`);
    } finally {
      log.mockRestore();
    }
  });
});
