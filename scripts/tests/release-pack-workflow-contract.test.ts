// executable_for TEST-prolog-bundled-release
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_CATALOG } from "../package-catalog.ts";

const ROOT = join(import.meta.dir, "..", "..");

type Step = {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
  if?: string;
};
type Job = {
  needs?: string | string[];
  uses?: string;
  with?: Record<string, string>;
  permissions?: Record<string, string>;
  steps?: Step[];
  strategy?: { matrix: { include: Record<string, string>[] } };
  "runs-on"?: string;
  if?: string;
};
type Workflow = {
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
};

function text(file: string): string {
  return readFileSync(join(ROOT, ".github", "workflows", file), "utf8");
}
/** Workflow text without YAML comments, so prose cannot trip token checks. */
function code(file: string): string {
  return text(file)
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}
function workflow(file: string): Workflow {
  return Bun.YAML.parse(text(file)) as Workflow;
}
function needs(job: Job): string[] {
  return typeof job.needs === "string" ? [job.needs] : (job.needs ?? []);
}
/** Run-step commands of a job, in order. */
function commands(job: Job): string[] {
  return (job.steps ?? []).flatMap((step) =>
    step.run ? [step.run.trim()] : [],
  );
}

const POPULATE =
  'node scripts/populate-swipl-platform-packages.mjs --artifacts "$RUNNER_TEMP/swipl-artifacts"';
const VERIFY =
  "bun run scripts/verify-publish-metadata.ts --require-swipl-payload";
const CLEAN = "bun run clean:tarballs";
const PACK = "bun run scripts/pack-packages.ts --slice publishable";

describe("SWI-Prolog archives reach the release by same-run artifacts", () => {
  test("swipl-build is callable, so a release builds the archives in its own run", () => {
    const build = workflow("swipl-build.yml");
    expect(Object.hasOwn(build.on, "workflow_call")).toBe(true);
    expect(Object.hasOwn(build.on, "workflow_dispatch")).toBe(true);
  });

  test("publish.yml and the dry run populate, verify, clean, and pack in the same order", () => {
    const publish = workflow("publish.yml").jobs["build-and-check"];
    const dry = workflow("release-pack.yml").jobs.pack;
    for (const job of [publish, dry]) {
      const run = commands(job);
      const indexes = [POPULATE, VERIFY, CLEAN, PACK].map((command) =>
        run.indexOf(command),
      );
      expect(indexes.every((index) => index >= 0)).toBe(true);
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    }
  });

  test("both download the same-run archives to the directory the populate step reads", () => {
    for (const job of [
      workflow("publish.yml").jobs["build-and-check"],
      workflow("release-pack.yml").jobs.pack,
    ]) {
      const download = (job.steps ?? []).find(
        (step) =>
          step.uses?.startsWith("actions/download-artifact@") &&
          step.with?.pattern === "swipl-*",
      );
      expect(download?.with?.path).toBe("${{ runner.temp }}/swipl-artifacts");
      // A same-run download names no run id, repository, or token.
      expect(Object.keys(download?.with ?? {}).sort()).toEqual([
        "path",
        "pattern",
      ]);
    }
  });

  test("the publish workflow builds the archives before it packs and only when releasing", () => {
    const jobs = workflow("publish.yml").jobs;
    expect(jobs["swipl-build"]?.uses).toBe(
      "./.github/workflows/swipl-build.yml",
    );
    expect(jobs["swipl-build"]?.if).toContain("!= 'NOOP'");
    expect(needs(jobs["swipl-build"])).toEqual(["check-release"]);
    expect(needs(jobs["build-and-check"])).toContain("swipl-build");
    expect(jobs["swipl-build"]?.permissions).toEqual({ contents: "read" });
  });

  test("no workflow downloads archives from another run or by run id", () => {
    for (const file of [
      "publish.yml",
      "release-pack.yml",
      "release-smoke.yml",
    ]) {
      const content = text(file);
      expect(content).not.toContain("run-id:");
      expect(content).not.toContain("gh run download");
      expect(content).not.toContain("github-token:");
    }
  });
});

describe("publish.yml ships the platform packages", () => {
  const publish = text("publish.yml");
  const jobs = workflow("publish.yml").jobs;

  test("uploads every publishable platform package tarball", () => {
    const upload = (jobs["build-and-check"].steps ?? []).find(
      (step) => step.name === "Upload package tarballs",
    );
    const paths = (upload?.with?.path ?? "").split("\n").map((p) => p.trim());
    for (const entry of PACKAGE_CATALOG) {
      if (!entry.publishable) continue;
      expect(paths).toContain(`packages/${entry.dir}/*.tgz`);
    }
    expect(paths).toContain("packages/SHA256SUMS");
  });

  test("publish waits for the bundled-runtime smoke and keeps npm provenance", () => {
    expect(needs(jobs.publish)).toContain("bundled-runtime-smoke");
    expect(jobs["bundled-runtime-smoke"].uses).toBe(
      "./.github/workflows/release-smoke.yml",
    );
    expect(jobs["bundled-runtime-smoke"].with).toEqual({
      "tarballs-artifact": "package-tarballs",
      "e2e-artifact": "release-e2e-compiled",
    });
    expect(publish).toContain(
      'npm publish "$tarball" --provenance --access public',
    );
    expect(jobs.publish.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });
  });

  test("verifies tarball digests and each bundled binary before publishing", () => {
    const steps = jobs.publish.steps ?? [];
    const verify = steps.findIndex((s) =>
      s.name?.startsWith("Verify tarball digests"),
    );
    const publishStep = steps.findIndex((s) => s.name === "Publish packages");
    expect(verify).toBeGreaterThan(-1);
    expect(verify).toBeLessThan(publishStep);
    const body = steps[verify]?.run ?? "";
    expect(body).toContain("sha256sum -c SHA256SUMS");
    expect(body).toContain("package/build-manifest.json");
    expect(body).toContain("package/bin/swipl");
  });
});

describe("the dry run cannot publish", () => {
  const content = code("release-pack.yml");
  const dry = workflow("release-pack.yml");

  test("holds no secret, no OIDC token, and no write permission", () => {
    expect(dry.permissions).toEqual({ contents: "read" });
    for (const job of Object.values(dry.jobs)) {
      expect(job.permissions).toBeUndefined();
    }
    expect(content).not.toMatch(/secrets\./);
    expect(content).not.toContain("id-token");
    expect(content).not.toContain("NODE_AUTH_TOKEN");
    expect(content).not.toContain("NPM_TOKEN");
    expect(content).not.toContain("registry-url");
  });

  test("has no publish, provenance, release, or tag command", () => {
    for (const forbidden of [
      "npm publish",
      "--provenance",
      "bun publish",
      "gh release",
      "git push",
      "publish-selective",
      "mcp-publisher",
    ]) {
      expect(content).not.toContain(forbidden);
    }
    for (const file of ["release-pack.yml", "release-smoke.yml"]) {
      for (const run of Object.values(workflow(file).jobs).flatMap((job) =>
        commands(job),
      )) {
        expect(run).not.toMatch(
          /\bnpm\s+(publish|dist-tag|deprecate|unpublish)\b/,
        );
      }
    }
  });

  test("runs on develop pushes, develop pull requests, and manual dispatch, never pull_request_target", () => {
    expect(Object.keys(dry.on).sort()).toEqual([
      "pull_request",
      "push",
      "workflow_dispatch",
    ]);
  });

  test("builds, packs, then smokes the tarballs it just packed", () => {
    expect(dry.jobs["swipl-build"].uses).toBe(
      "./.github/workflows/swipl-build.yml",
    );
    expect(needs(dry.jobs.pack)).toEqual(["swipl-build"]);
    expect(needs(dry.jobs.smoke)).toEqual(["pack"]);
    expect(dry.jobs.smoke.uses).toBe("./.github/workflows/release-smoke.yml");
    expect(dry.jobs.smoke.with).toEqual({
      "tarballs-artifact": "release-pack-tarballs",
      "e2e-artifact": "release-pack-e2e-compiled",
    });
    const uploads = (dry.jobs.pack.steps ?? [])
      .filter((step) => step.uses?.startsWith("actions/upload-artifact@"))
      .map((step) => step.with?.name);
    expect(uploads).toEqual([
      "release-pack-tarballs",
      "release-pack-e2e-compiled",
    ]);
  });
});

describe("the bundled-runtime smoke proves the run with no SWI-Prolog", () => {
  const smoke = workflow("release-smoke.yml");
  const job = smoke.jobs.smoke;

  test("covers Linux x64 and macOS arm64, plus the other two launch targets", () => {
    const rows = job.strategy?.matrix.include ?? [];
    const runners = Object.fromEntries(
      rows.map((row) => [row.target, row.runner]),
    );
    expect(runners).toEqual({
      "linux-x64-gnu": "ubuntu-24.04",
      "darwin-arm64": "macos-15",
      "linux-arm64-gnu": "ubuntu-24.04-arm",
      "darwin-x64": "macos-15-intel",
    });
  });

  test("asserts there is no swipl before anything is downloaded and again afterwards", () => {
    const steps = job.steps ?? [];
    const download = steps.findIndex((s) =>
      s.uses?.startsWith("actions/download-artifact@"),
    );
    const before = steps.findIndex((s) => s.run?.includes("command -v swipl"));
    expect(before).toBeGreaterThan(-1);
    expect(before).toBeLessThan(download);
    const last = steps[steps.length - 1];
    expect(last?.run).toContain("command -v swipl");
    expect(last?.if).toBe("always()");
  });

  test("never installs SWI-Prolog by any route", () => {
    const content = code("release-smoke.yml");
    expect(content).not.toContain("ci-install-swi-prolog");
    for (const run of commands(job)) {
      expect(run).not.toMatch(/\b(brew|apt|apt-get|dnf|yum|conda|pip)\b/);
      expect(run).not.toMatch(/ppa:swi-prolog|swi-prolog\.org/);
    }
  });

  test("runs the bundled-runtime e2e through the packed runner with the bundle required", () => {
    const run = (job.steps ?? []).find((s) =>
      s.run?.includes("scripts/run-packed-e2e.mjs"),
    );
    expect(run?.run).toContain("bundled-swipl-runtime.test.js");
    expect(run?.env?.KIBI_PACKED_REQUIRE_BUNDLED_SWIPL).toBe("1");
    expect(run?.env?.KIBI_TEST_TARBALLS).toBe(
      "${{ github.workspace }}/packages",
    );
  });

  test("is read-only and secret-free", () => {
    expect(smoke.permissions).toEqual({ contents: "read" });
    expect(code("release-smoke.yml")).not.toMatch(/secrets\.|id-token/);
  });
});
