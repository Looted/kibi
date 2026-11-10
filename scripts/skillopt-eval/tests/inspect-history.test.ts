import { afterEach, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as bundledSkills from "../../../packages/cli/src/public/skills";
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
  expect(Object.keys(report.baselineBodyHashes)).toHaveLength(6);

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

test("writes to the process streams and checks the built baseline against source", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-inspect-defaults-"));
  roots.push(root);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const out = spyOn(process.stdout, "write").mockImplementation(((
    text: string,
  ) => {
    stdout.push(text);
    return true;
  }) as never);
  const err = spyOn(process.stderr, "write").mockImplementation(((
    text: string,
  ) => {
    stderr.push(text);
    return true;
  }) as never);
  const realLoad = bundledSkills.loadBundledSkillFrom;
  const load = spyOn(bundledSkills, "loadBundledSkillFrom");
  try {
    expect(await main(["--help"])).toBe(0);
    expect(stdout.join("")).toContain("Offline inventory");
    expect(await main(["--bogus"])).toBe(2);
    expect(stderr.join("")).toContain("Usage: inspect-history.ts");

    load.mockImplementation(((skillRoot: string, skill: string) =>
      skillRoot.includes("/dist/")
        ? {
            ...realLoad(skillRoot.replace("/dist/", "/src/"), skill as never),
            body: "stale",
          }
        : realLoad(skillRoot, skill as never)) as never);
    stderr.length = 0;
    expect(await main(["--artifact-root", join(root, "runs")])).toBe(1);
    expect(stderr.join("")).toContain(
      `Bundled baseline ${CANONICAL_SKILLS[0]} is stale; run bun run build:cli`,
    );

    load.mockImplementation(((skillRoot: string, skill: string) =>
      realLoad(skillRoot.replace("/dist/", "/src/"), skill as never)) as never);
    stdout.length = 0;
    await mkdir(join(root, "runs"));
    expect(await main(["--artifact-root", join(root, "runs")])).toBe(0);
    expect(JSON.parse(stdout.join("")).baselineRoot).toContain(
      "packages/cli/dist/public/skills",
    );
  } finally {
    load.mockRestore();
    out.mockRestore();
    err.mockRestore();
  }
});
