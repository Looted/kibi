// Follows the README quick start literally on a machine with no SWI-Prolog,
// with the packed release tarballs standing in for the registry (the npm names
// are not published until the first release).
//
//   node scripts/simulate-readme-quickstart.mjs --tarballs <packages dir>
//
// <packages dir> holds packages/<dir>/<name>-<version>.tgz exactly as the
// release dry run packs them, including every kibi-swipl-<platform> tarball.
//
// The commands come out of the README's "Quick start" code block, not out of
// this script, so the README cannot drift from what is exercised: each
// `npm install` argument that names a packed package is replaced by that
// package's tarball, and everything else runs unchanged. Transitive Kibi
// packages that the registry would serve are redirected to their tarballs with
// npm `overrides`. The coding-agent step ("Bootstrap Kibi for this
// repository") is replaced by the same read-only plan and approved apply the
// agent performs, driven through Kibi's JSON routes, followed by sync and
// check. Passing is not registry verification: it proves the documented steps
// reach a bootstrapped project from these tarballs.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

/** The shell commands of the README's first quick-start code block. */
// implements REQ-prolog-bundled-quickstart
export function quickStartCommands(readme) {
  const section = readme.split(/^## Quick start\s*$/m)[1];
  if (section === undefined) throw new Error("README has no Quick start");
  const body = section.split(/^## /m)[0];
  const fence = /```(?:bash|sh)\n([\s\S]*?)```/.exec(body);
  if (fence === null) {
    throw new Error("README Quick start has no bash code block");
  }
  const commands = fence[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  if (commands.length === 0) {
    throw new Error("README Quick start code block holds no commands");
  }
  return commands;
}

/** `{ package name -> tarball path }` for every packed package. */
// implements REQ-prolog-bundled-quickstart
export function packedTarballs(packagesDir) {
  const found = {};
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(packagesDir, entry.name);
    const tarballs = readdirSync(dir).filter((name) => name.endsWith(".tgz"));
    if (tarballs.length === 0) continue;
    if (tarballs.length > 1) {
      throw new Error(`${dir} holds more than one tarball: ${tarballs}`);
    }
    const { name } = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    found[name] = path.join(dir, tarballs[0]);
  }
  return found;
}

/**
 * Substitute packed tarballs for the package names an `npm install` line asks
 * for. Returns the rewritten command and the names that were substituted.
 */
// implements REQ-prolog-bundled-quickstart
export function substituteTarballs(command, tarballs) {
  if (!/^npm (install|i|add)\b/.test(command)) {
    return { command, direct: [] };
  }
  const direct = [];
  const rewritten = command
    .split(/\s+/)
    .map((token) => {
      if (token in tarballs) {
        direct.push(token);
        return JSON.stringify(tarballs[token]);
      }
      return token;
    })
    .join(" ");
  return { command: rewritten, direct };
}

function run(label, command, options) {
  console.log(`\n$ ${label}`);
  const result = spawnSync(command, {
    shell: true,
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (out !== "")
    console.log(out.length > 2000 ? `${out.slice(0, 2000)}\n...` : out);
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`\`${label}\` exited ${result.status}`);
  }
  return { status: result.status, stdout: result.stdout ?? "" };
}

function swiplOnPath(env) {
  for (const dir of (env.PATH ?? "").split(path.delimiter)) {
    if (dir === "") continue;
    for (const name of ["swipl", "swipl.exe"]) {
      if (existsSync(path.join(dir, name))) return path.join(dir, name);
    }
  }
  return undefined;
}

function hostPlatformPackage() {
  return process.platform === "linux"
    ? `kibi-swipl-linux-${process.arch}-gnu`
    : `kibi-swipl-${process.platform}-${process.arch}`;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not print JSON: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Runs the whole simulation; returns the steps it completed. */
// implements REQ-prolog-bundled-quickstart
export function simulate({ packagesDir, readme, requireBundled = true }) {
  const tarballs = packedTarballs(packagesDir);
  const platform = hostPlatformPackage();
  assert(
    platform in tarballs,
    `no ${platform} tarball under ${packagesDir}; pack the publishable slice`,
  );
  const { KIBI_SWIPL: _override, ...env } = process.env;
  assert(
    swiplOnPath(env) === undefined,
    `swipl is on PATH (${swiplOnPath(env)}); this run would prove nothing`,
  );

  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-readme-")));
  const project = path.join(root, "my-repository");
  const completed = [];
  try {
    mkdirSync(path.join(project, "src"), { recursive: true });
    env.npm_config_cache = path.join(root, "npm-cache");
    env.npm_config_update_notifier = "false";
    env.npm_config_fund = "false";
    env.npm_config_audit = "false";
    const at = (cwd) => ({ cwd, env });

    // "your repository": an existing Git project with a package.json.
    writeFileSync(
      path.join(project, "src", "add.ts"),
      "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
    );
    const commands = quickStartCommands(readme);
    const installs = commands.map((c) => substituteTarballs(c, tarballs));
    const direct = new Set(installs.flatMap((entry) => entry.direct));
    assert(
      direct.size > 0,
      "the README quick start installs no package this run can substitute",
    );
    // Everything else the registry would serve is a packed tarball too.
    const overrides = Object.fromEntries(
      Object.entries(tarballs)
        .filter(([name]) => !direct.has(name))
        .map(([name, file]) => [name, `file:${file}`]),
    );
    writeFileSync(
      path.join(project, "package.json"),
      `${JSON.stringify({ name: "my-repository", version: "1.0.0", private: true, overrides }, null, 2)}\n`,
    );
    run("git init", "git init -q -b main", at(project));
    run(
      "git commit",
      'git -c user.name=readme -c user.email=readme@example.invalid add -A && git -c user.name=readme -c user.email=readme@example.invalid commit -q -m "existing project"',
      at(project),
    );
    completed.push("repository");

    // The README steps, verbatim apart from the registry -> tarball swap.
    commands.forEach((original, index) => {
      const { command } = installs[index];
      run(
        command === original
          ? original
          : `${original}    # tarballs substituted`,
        command,
        at(project),
      );
      completed.push(`readme: ${original}`);
    });

    const kibi = (args, extra = {}) =>
      run(`npm exec -- kibi ${args}`, `npm exec --offline -- kibi ${args}`, {
        ...at(project),
        ...extra,
      });

    const doctor = parseJson(
      kibi("doctor --format json", { allowFailure: true }).stdout,
      "kibi doctor",
    );
    const check = doctor.checks.find((entry) => entry.name === "SWI-Prolog");
    assert(
      check?.passed === true,
      `doctor SWI-Prolog check: ${check?.message}`,
    );
    if (requireBundled) {
      assert(
        check.details?.source === "bundled",
        `doctor reported ${check.details?.source}, expected bundled`,
      );
      assert(
        String(check.details?.path).startsWith(
          path.join(project, "node_modules", platform),
        ),
        `bundled swipl is not inside ${platform}: ${check.details?.path}`,
      );
    }
    completed.push(
      `doctor: ${check.details?.source} ${check.details?.version}`,
    );

    // Bootstrap Kibi for this repository: the agent's read-only plan, then the
    // approved apply of that exact plan.
    const planned = parseJson(
      kibi("plan-bootstrap --input -", { input: "{}\n" }).stdout,
      "kibi plan-bootstrap",
    );
    const plan = planned.data?.plan;
    assert(
      planned.status === "success" && plan?.status === "ready",
      `bootstrap plan is not ready: ${JSON.stringify(planned.error ?? plan?.status)}`,
    );
    const applied = parseJson(
      kibi("apply-plan --input -", {
        input: `${JSON.stringify({ plan, approvedPlanHash: plan.planHash })}\n`,
      }).stdout,
      "kibi apply-plan",
    );
    assert(
      applied.status === "success" && applied.data?.outcome === "applied",
      `bootstrap apply failed: ${JSON.stringify(applied.error ?? applied.data?.outcome)}`,
    );
    completed.push(`bootstrap: applied plan ${plan.planHash.slice(0, 12)}`);

    kibi("check");
    completed.push("check");
    kibi("sync");
    completed.push("sync");
    const status = parseJson(
      kibi("status --format json").stdout,
      "kibi status",
    );
    assert(
      status.syncState === "fresh" && status.dirty === false,
      `status is not fresh and clean: ${JSON.stringify({ syncState: status.syncState, dirty: status.dirty })}`,
    );
    completed.push("status: fresh, clean");

    assert(
      swiplOnPath(env) === undefined,
      "swipl appeared on PATH during the run",
    );
    return completed;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// implements REQ-prolog-bundled-quickstart
export function parseArgs(argv) {
  const options = { packagesDir: undefined, readme: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tarballs") options.packagesDir = argv[++index];
    else if (arg === "--readme") options.readme = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.packagesDir) {
    throw new Error(
      "usage: simulate-readme-quickstart.mjs --tarballs <packages dir> [--readme <file>]",
    );
  }
  return options;
}

if (import.meta.main) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const readme = readFileSync(
      path.resolve(options.readme ?? path.join(REPO_ROOT, "README.md")),
      "utf8",
    );
    const completed = simulate({
      packagesDir: path.resolve(options.packagesDir),
      readme,
    });
    const summary = [
      `README quick start reached a bootstrapped project on ${process.platform}-${process.arch} (packed tarballs, no SWI-Prolog installed):`,
      ...completed.map((step) => `- ${step}`),
      "",
      "Registry installation is not verified here: the kibi-swipl-* names are not published yet.",
    ].join("\n");
    console.log(`\n${summary}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, {
        flag: "a",
      });
    }
  } catch (error) {
    console.error(
      `simulate-readme-quickstart: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
