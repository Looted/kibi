import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { missingRequiredGuidance } from "../candidate-body";
import { CANONICAL_SKILLS } from "../catalog";
import { main } from "../inspect-history";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    output: {
      stdout: (text: string) => {
        stdout += text;
      },
      stderr: (text: string) => {
        stderr += text;
      },
    },
    read: () => ({ stdout, stderr }),
  };
}

test("help and invalid options do not load baselines or start paid operations", async () => {
  const help = capture();
  expect(await main(["--help"], help.output)).toBe(0);
  expect(help.read().stdout).toContain("Offline inventory");
  for (const args of [
    ["--allow-paid"],
    ["--artifact-root"],
    ["--baseline-root", ""],
    ["--artifact-root", "/tmp", "--artifact-root", "/tmp"],
  ]) {
    const output = capture();
    expect(await main(args, output.output)).toBe(2);
    expect(output.read().stdout).toBe("");
  }
});

test("CLI screens a historical one-shot against the supplied bundled baseline without writing", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-history-cli-"));
  roots.push(root);
  const baselineRoot = join(root, "baselines");
  for (const skill of CANONICAL_SKILLS) {
    const skillRoot = join(baselineRoot, skill);
    await mkdir(skillRoot, { recursive: true });
    await writeFile(
      join(skillRoot, "SKILL.md"),
      `---\nid: ${skill}\nname: ${skill}\ndescription: Synthetic baseline\nversion: 1.0.0\nkibiCompatibility: ">=1.0.0"\n---\nBaseline body.\n`,
    );
  }
  const artifactRoot = join(root, "optimize");
  const runId = "00000000-0000-4000-8000-000000000111";
  const accepted = join(
    artifactRoot,
    runId,
    "skills/kibi-usage/one-shot/accepted-output",
  );
  await mkdir(accepted, { recursive: true });
  const body = `${missingRequiredGuidance("").join("\n")}\n${"Generic guidance. ".repeat(100)}`;
  const hash = createHash("sha256").update(body).digest("hex");
  await writeFile(join(accepted, "candidate-body.md"), body);
  await writeFile(
    join(accepted, "receipt.json"),
    JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-accepted-optimizer-output",
      runId: `${runId}-one-shot`,
      skill: "kibi-usage",
      step: 1,
      bodyHash: hash,
      bodyBytes: Buffer.byteLength(body),
    }),
  );
  const output = capture();
  expect(
    await main(
      ["--artifact-root", artifactRoot, "--baseline-root", baselineRoot],
      output.output,
    ),
  ).toBe(0);
  expect(output.read().stderr).toBe("");
  const report = JSON.parse(output.read().stdout);
  expect(report).toMatchObject({
    screening: "offline-only",
    paidModelCalls: 0,
    baselineRoot,
    productionAdoption: "external-verdict-required",
  });
  expect(report.shortlist).toHaveLength(1);
  expect(report.shortlist[0].hash).toBe(hash);
  expect(Object.keys(report.baselineBodyHashes)).toHaveLength(4);

  const missingRoot = capture();
  expect(
    await main(
      [
        "--artifact-root",
        join(root, "missing"),
        "--baseline-root",
        baselineRoot,
      ],
      missingRoot.output,
    ),
  ).toBe(1);
  expect(JSON.parse(missingRoot.read().stdout).shortlist).toEqual([]);
});

test("missing bundled baseline fails rather than silently screening without it", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-history-no-baseline-"));
  roots.push(root);
  const output = capture();
  expect(await main(["--baseline-root", root], output.output)).toBe(1);
  expect(output.read().stdout).toBe("");
  expect(output.read().stderr).toContain("Historical screening failed");
});
