import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  exactBranchStorePath,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  assert.strictEqual(channels?.length, 3, `invalid RGB color: ${hex}`);
  const [red = 0, green = 0, blue = 0] = channels ?? [];
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function brandToken(html: string, name: string): string {
  const value = html.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(value, `report should define the --${name} brand token`);
  return value;
}

function svgFill(element: string): string {
  const hex = element.match(/\bfill="(#[0-9a-f]{6})"/i)?.[1];
  if (hex) return hex.toLowerCase();
  const rgb = element.match(/\bfill:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  assert.ok(rgb, `visible SVG shape has no supported fill: ${element}`);
  return `#${rgb
    .slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rounded(value: string): string {
  return Number(value).toFixed(1);
}

function svgVisualFingerprint(svg: string): string[] {
  return [...svg.matchAll(/<(path|circle|ellipse)\b[^>]*>/g)].map((match) => {
    const [element = "", kind = ""] = match;
    const fill = svgFill(element);
    if (kind === "path") {
      const data = element.match(/\bd="([^"]+)"/)?.[1];
      assert.ok(data, `SVG path has no path data: ${element}`);
      const tokens = data.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
      assert.ok(tokens.length >= 5, `SVG path data is incomplete: ${data}`);
      return [
        "path",
        fill,
        ...tokens.map((token) => (/[A-Za-z]/.test(token) ? token : rounded(token))),
      ].join(":");
    }

    const attribute = (name: string): string => {
      const value = element.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
      assert.ok(value, `SVG ${kind} has no ${name}: ${element}`);
      return value;
    };
    const radius =
      kind === "circle"
        ? Number(attribute("r"))
        : (Number(attribute("rx")) + Number(attribute("ry"))) / 2;
    return [
      "round",
      fill,
      rounded(attribute("cx")),
      rounded(attribute("cy")),
      radius.toFixed(1),
    ].join(":");
  });
}

function labeledSvg(html: string, ariaLabel: string): string {
  const escaped = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const svg = html.match(
    new RegExp(`<svg\\b[^>]*aria-label="${escaped}"[^>]*>[\\s\\S]*?<\\/svg>`),
  )?.[0];
  assert.ok(svg, `missing generated SVG labeled ${ariaLabel}`);
  return svg;
}

function proofStageStatus(row: Record<string, unknown>, name: string): string {
  const stages = row.proofStages as Record<string, unknown> | undefined;
  const stage = stages?.[name] as Record<string, unknown> | undefined;
  return String(stage?.status ?? "missing");
}

export async function verifyHtmlRequirementHealthReport(
  sandbox: TestSandbox,
): Promise<void> {
  const coverageResult = await kibi(sandbox, [
    "coverage",
    "--by",
    "req",
    "--include-passing",
    "--format",
    "json",
  ]);
  assert.strictEqual(
    coverageResult.exitCode,
    0,
    coverageResult.stderr || coverageResult.stdout,
  );
  const coverageEnvelope = JSON.parse(coverageResult.stdout) as {
    data?: { rows?: Record<string, unknown>[] };
    rows?: Record<string, unknown>[];
  };
  const coverageRows = coverageEnvelope.data?.rows ?? coverageEnvelope.rows ?? [];
  const currentRows = coverageRows.filter(
    (row) => row.proofStatus !== "not_applicable",
  );
  assert.deepStrictEqual(
    currentRows.map((row) => row.id),
    ["REQ-001"],
    "the packed report fixture should contain one current requirement",
  );
  const fixtureRequirement = currentRows[0]!;
  const fixtureFailsSemanticGate = [
    "semanticInventory",
    "logicGrounding",
    "contradictions",
  ].some((stage) => proofStageStatus(fixtureRequirement, stage) !== "passed");
  assert.strictEqual(
    fixtureFailsSemanticGate,
    true,
    "the known fixture row should first fail the semantic gate",
  );

  const { stdout, stderr, exitCode } = await kibi(
    sandbox,
    ["report", "--output", "kibi-report"],
    { timeoutMs: 120000 },
  );
  assert.strictEqual(
    exitCode,
    0,
    `report should succeed. Output: ${stdout}${stderr}`,
  );

  const html = await readFile(
    path.join(sandbox.repoDir, "kibi-report", "index.html"),
    "utf8",
  );
  assert.match(html, /Kibi Requirement Health · develop/);
  assert.match(
    html,
    /viewBox="0 0 308 309" role="img" aria-label="Kibi logo"/,
  );
  assert.match(
    html,
    /viewBox="-2 10 395 148" role="img" aria-label="Kibi"/,
  );
  assert.match(
    html,
    /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"/,
  );
  assert.match(html, /current requirements/);
  assert.match(html, /Test requirement/);
  assert.match(html, /Missing knowledge remains visible/);

  const canonicalLogo = await readFile(
    path.resolve(process.cwd(), "assets", "logo.svg"),
    "utf8",
  );
  const canonicalWordmark = await readFile(
    path.resolve(process.cwd(), "assets", "wordmark.svg"),
    "utf8",
  );
  assert.deepStrictEqual(
    svgVisualFingerprint(labeledSvg(html, "Kibi logo")),
    svgVisualFingerprint(canonicalLogo),
    "generated logo geometry and fills should match the canonical asset fingerprint",
  );
  assert.deepStrictEqual(
    svgVisualFingerprint(labeledSvg(html, "Kibi")),
    svgVisualFingerprint(canonicalWordmark),
    "generated wordmark geometry and fills should match the canonical asset fingerprint",
  );

  const ratio = html.match(
    /aria-label="(\d+)% proven, ([\d,]+) of ([\d,]+) current requirements"/,
  );
  assert.ok(ratio, "report should expose its exact proof ratio to assistive technology");
  const percent = Number(ratio[1]);
  const proven = Number(ratio[2]?.replaceAll(",", ""));
  const current = Number(ratio[3]?.replaceAll(",", ""));
  assert.strictEqual(
    percent,
    current === 0 ? 0 : Math.round((proven / current) * 100),
  );
  assert.match(html, new RegExp(`>${percent}<span>%<\\/span>`));
  assert.match(
    html,
    new RegExp(`${proven.toLocaleString("en-US")} of ${current.toLocaleString("en-US")} current requirements`),
  );

  const gates = [
    ...html.matchAll(
      /proof-gate__count">([\d,]+)<\/div>\s*<div class="proof-gate__label">([^<]+)<\/div>\s*<div class="proof-gate__drop">([^<]+)<\/div>/g,
    ),
  ].map((match) => ({
    remaining: Number(match[1]?.replaceAll(",", "")),
    label: match[2],
    drop: match[3] ?? "",
  }));
  assert.deepStrictEqual(
    gates.map((gate) => gate.label),
    ["Semantic model", "Scenario", "Implementation", "E2E", "Evidence"],
  );
  assert.deepStrictEqual(
    gates.map((gate) => gate.remaining),
    [0, 0, 0, 0, 0],
    "the single known fixture row should leave the rail at its semantic gate",
  );
  assert.deepStrictEqual(
    gates.map((gate) => gate.drop),
    ["−1 blocked here", "No drop", "No drop", "No drop", "No drop"],
    "the row's actual earliest unmet gate should receive the only drop",
  );
  assert.ok(
    gates.every(
      (gate, index) => index === 0 || gate.remaining <= gates[index - 1]!.remaining,
    ),
    "proof-gate counts should be sequential and non-increasing",
  );
  const blocked = gates.reduce((total, gate) => {
    const count = gate.drop.match(/−([\d,]+) blocked here/)?.[1];
    return total + Number(count?.replaceAll(",", "") ?? 0);
  }, 0);
  assert.strictEqual(blocked, current - (gates.at(-1)?.remaining ?? 0));
  assert.strictEqual(gates.at(-1)?.remaining, proven);
  assert.match(
    html,
    /Counts are sequential\. Each drop is the earliest unmet gate/,
  );

  for (const label of [
    "Semantic model",
    "Scenario",
    "Implementation",
    "E2E test",
    "Evidence",
  ]) {
    assert.match(html, new RegExp(`stage__label">${label}<`));
  }
  assert.match(html, /stage__icon" aria-hidden="true">[✓!×—]</);
  assert.match(html, /proof-badge[^>]*>Needs attention<|proof-badge[^>]*>Proven</);

  const deepCarbon = brandToken(html, "deep-carbon");
  const carbon = brandToken(html, "carbon");
  for (const token of ["snow", "mist"]) {
    assert.ok(
      contrastRatio(brandToken(html, token), deepCarbon) >= 4.5,
      `${token} text should meet WCAG AA contrast on deep carbon`,
    );
  }
  for (const token of ["ice", "success", "warning", "danger"]) {
    assert.ok(
      contrastRatio(brandToken(html, token), carbon) >= 4.5,
      `${token} status text should meet WCAG AA contrast on carbon`,
    );
  }
  assert.match(html, /@media \(max-width: 760px\)/);
  assert.match(html, /\.overview \{ grid-template-columns: 1fr;/);
  assert.match(html, /@media print/);
  assert.match(html, /color-scheme: light/);
  assert.doesNotMatch(
    html,
    /(?:src|href)=["']https?:\/\//i,
    "report should not reference network assets",
  );

  const badge = await readFile(
    path.join(sandbox.repoDir, "kibi-report", "badge.svg"),
    "utf8",
  );
  assert.match(badge, /Kibi requirement health:/);
  assert.match(badge, /role="img" aria-label="Kibi requirement health:/);
  assert.match(badge, /viewBox="0 0 308 309" aria-hidden="true"/);
  assert.match(badge, /#1d1e23/);
  assert.match(badge, /#a2d3f4/);
  const badgeLogo = badge.match(
    /<svg x="6" y="2"[\s\S]*?<\/svg>/,
  )?.[0];
  assert.ok(badgeLogo, "badge should embed the canonical logo");
  assert.deepStrictEqual(
    svgVisualFingerprint(badgeLogo),
    svgVisualFingerprint(canonicalLogo),
    "badge logo geometry and fills should match the canonical asset fingerprint",
  );
  assert.doesNotMatch(
    badge,
    /(?:src|href)=["']https?:\/\//i,
    "badge should not reference network assets",
  );

  console.log("  ✓ HTML requirement health report generated");
}

if (RUN_NODE_TEST_SUITE) {
  describe("CLI E2E: Install and Basic Commands", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        // Check prerequisites
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn("⚠️  SWI-Prolog not available, skipping E2E tests");
          return;
        }

        // Pack all packages
        tarballs = await packAll();

        // Create isolated sandbox
        sandbox = createSandbox();

        // Install packages
        await sandbox.install(tarballs);

        // Initialize git repo
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    after(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 120000 },
    );

    it("should install kibi-cli and show version", async () => {
      if (!hasProlog) return;

      const { stdout, exitCode } = await kibi(sandbox, ["--version"]);

      assert.strictEqual(exitCode, 0, "kibi --version should succeed");
      assert.match(stdout, /\d+\.\d+\.\d+/, "Version should be semantic");
      console.log("  ✓ Version:", stdout.trim());
    });

    it("should run kibi doctor before init (diagnostic mode)", async () => {
      if (!hasProlog) return;

      const { stdout, stderr, exitCode } = await kibi(sandbox, ["doctor"]);

      // doctor should run but may fail because .kb/ doesn't exist yet
      // We just verify it executes and produces output
      const output = stdout + stderr;
      assert.ok(output.length > 0, "doctor should produce output");

      // Should mention SWI-Prolog check
      assert.ok(
        output.includes("SWI-Prolog") || output.includes("prolog"),
        "doctor should check for SWI-Prolog",
      );

      console.log("  ✓ Doctor ran successfully (diagnostic output captured)");
    });

    it("should initialize kibi with hooks", async () => {
      if (!hasProlog) return;

      // Hooks are installed by default, no --hooks flag needed
      const { stdout, exitCode } = await kibi(sandbox, ["init"]);

      assert.strictEqual(exitCode, 0, "kibi init should succeed");
      assert.ok(
        stdout.includes("✓") || stdout.includes("success"),
        "Init should show success indicators",
      );

      console.log("  ✓ Kibi initialized with hooks");
    });

    it("should pass kibi doctor after init", async () => {
      if (!hasProlog) return;

      const { stdout, exitCode } = await kibi(sandbox, ["doctor"]);

      assert.strictEqual(exitCode, 0, "doctor should pass after init");
      assert.ok(
        stdout.includes("passed") ||
          stdout.includes("✓") ||
          stdout.includes("All checks"),
        "doctor should report success",
      );

      console.log("  ✓ Doctor passes after init");
    });

    it("should sync entities from markdown files", async () => {
      if (!hasProlog) return;

      // Create test markdown files
      createMarkdownFile(
        sandbox,
        "documentation/requirements/REQ-001.md",
        {
          id: "REQ-001",
          title: "Test requirement",
          status: "open",
          tags: ["test"],
        },
        "This is a test requirement for E2E validation.",
      );

      createMarkdownFile(
        sandbox,
        "documentation/scenarios/SCEN-001.md",
        {
          id: "SCEN-001",
          title: "Test scenario",
          status: "draft",
        },
        "Given a test setup\nWhen something happens\nThen result occurs",
      );

      // Run sync
      const { stdout, exitCode } = await kibi(sandbox, ["sync"]);

      assert.strictEqual(exitCode, 0, "sync should succeed");
      assert.ok(
        stdout.includes("Imported") || stdout.includes("✓"),
        "sync should report import success",
      );

      console.log("  ✓ Sync imported entities");
    });

    it("should query entities after sync", async () => {
      if (!hasProlog) return;

      const { stdout, exitCode } = await kibi(sandbox, ["query", "req"]);

      assert.strictEqual(exitCode, 0, "query should succeed");
      assert.ok(
        stdout.includes("REQ-001") || stdout.includes("Test requirement"),
        "query should show the requirement",
      );

      console.log("  ✓ Query returned entities");
    });

    it("should run kibi check after sync", async () => {
      if (!hasProlog) return;

      // Run check with extended timeout
      const { stdout, stderr, exitCode } = await kibi(sandbox, ["check"], {
        timeoutMs: 60000,
      });

      const output = stdout + stderr;

      // check should pass cleanly — the entities created in earlier tests
      // (REQ-001, SCEN-001) have no relationship violations
      assert.strictEqual(
        exitCode,
        0,
        `check should pass with exit code 0, got ${exitCode}. Output: ${output}`,
      );

      // Should produce output confirming no violations
      assert.ok(output.length > 0, "check should produce output");
      assert.ok(
        output.includes("No violations") || output.includes("✓"),
        `Successful check should indicate no violations. Output: ${output}`,
      );

      console.log(`  ✓ Check completed (exit code: ${exitCode})`);
    });

    it("should generate a self-contained HTML requirement health report", async () => {
      if (!hasProlog) return;
      await verifyHtmlRequirementHealthReport(sandbox);
    });

    it("should have created .kb directory structure", async () => {
      if (!hasProlog) return;

      // Check .kb directory exists
      const { exitCode: kbExists } = await run("test", ["-d", ".kb"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      assert.strictEqual(kbExists, 0, ".kb directory should exist");

      // Check branch-specific KB exists
      const { exitCode: branchExists } = await run(
        "test",
        ["-d", exactBranchStorePath(sandbox.repoDir, "develop")],
        { cwd: sandbox.repoDir, env: sandbox.env },
      );

      assert.strictEqual(
        branchExists,
        0,
        "exact develop branch store should exist",
      );

      console.log("  ✓ KB directory structure validated");
    });
  });
}
