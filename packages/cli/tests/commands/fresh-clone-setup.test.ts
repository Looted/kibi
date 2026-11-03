// executable_for TEST-kibi-fresh-clone-setup
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  KIBI_INSTRUCTIONS_BEGIN,
  writeAgentInstructions,
} from "../../src/commands/agent-instructions.js";
import {
  KIBI_PREPARE_COMMAND,
  syncPrepareScript,
} from "../../src/commands/hooks-install.js";
import {
  DEFAULT_SETUP_CHOICES,
  autoSyncEnabled,
  readSetupChoices,
  writeSetupChoices,
} from "../../src/commands/setup-choices.js";
import { isolatedCliSandboxEnv, spawnSync } from "../helpers/isolated-env.js";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");
const cliPackage = path.resolve(__dirname, "../..");

let root: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-fresh-clone-")));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(relative: string, content: string): void {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

function packageJson(): Record<string, unknown> {
  return JSON.parse(read("package.json")) as Record<string, unknown>;
}

function run(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd = root,
) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    env: isolatedCliSandboxEnv({ CI: "", ...env }),
  });
}

function kibi(args: readonly string[], env: NodeJS.ProcessEnv = {}) {
  return run("node", [kibiBin, ...args], env);
}

function gitRepo(): void {
  run("git", ["init", "-q", "-b", "main"]);
  run("git", [
    "-c",
    "user.email=t@example.com",
    "-c",
    "user.name=T",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "init",
  ]);
}

describe("setup choices", () => {
  test("default to auto-sync, prepare hooks and agent instructions on, CI gate off", () => {
    expect(readSetupChoices(root)).toMatchObject({
      ...DEFAULT_SETUP_CHOICES,
      source: "defaults",
    });
    expect(DEFAULT_SETUP_CHOICES).toEqual({
      autoSync: true,
      prepareHooks: true,
      agentInstructions: true,
      ciGate: false,
    });
  });

  test("live in package.json kibi.setup next to other Kibi keys, keeping the file's layout", () => {
    write(
      "package.json",
      `{\n    "name": "demo",\n    "kibi": { "declinedPlugins": ["kibi-plugin-ui"] }\n}\n`,
    );
    expect(writeSetupChoices(root, { autoSync: false })).toBe("package.json");
    const text = read("package.json");
    expect(text).toStartWith('{\n    "name"');
    expect(JSON.parse(text).kibi).toEqual({
      declinedPlugins: ["kibi-plugin-ui"],
      setup: { autoSync: false },
    });
    expect(readSetupChoices(root)).toMatchObject({
      autoSync: false,
      prepareHooks: true,
      source: "package.json",
    });
    expect(writeSetupChoices(root, { autoSync: false })).toBeNull();
  });

  test("go to .kb/setup.json in a repository without a root package.json, never creating one", () => {
    mkdirSync(path.join(root, ".kb"));
    expect(writeSetupChoices(root, { ciGate: true })).toBe(".kb/setup.json");
    expect(existsSync(path.join(root, "package.json"))).toBe(false);
    expect(readSetupChoices(root)).toMatchObject({
      ciGate: true,
      source: "setup.json",
    });
  });

  test("KIBI_AUTO_SYNC=0 turns auto-sync off whatever the project recorded", () => {
    expect(autoSyncEnabled(root, {})).toBe(true);
    expect(autoSyncEnabled(root, { KIBI_AUTO_SYNC: "0" })).toBe(false);
  });
});

describe("agent instructions", () => {
  test("create AGENTS.md and a CLAUDE.md that imports it", () => {
    const result = writeAgentInstructions(root);
    expect(result).toEqual({ agents: "created", claude: "created" });
    expect(read("AGENTS.md")).toContain("kb_search");
    expect(read("AGENTS.md")).toContain("kb_query");
    expect(read("CLAUDE.md")).toContain("@AGENTS.md");
  });

  test("append to a user's file, never touch text outside the markers, and stay idempotent", () => {
    write("AGENTS.md", "# Rules\n\nUse tabs.\n");
    write("CLAUDE.md", "# Claude\n\n@AGENTS.md\n");
    expect(writeAgentInstructions(root)).toEqual({
      agents: "updated",
      claude: "unchanged",
    });
    const first = read("AGENTS.md");
    expect(first).toStartWith("# Rules\n\nUse tabs.\n\n");
    expect(first).toContain(KIBI_INSTRUCTIONS_BEGIN);
    expect(read("CLAUDE.md")).toBe("# Claude\n\n@AGENTS.md\n");

    write("AGENTS.md", `${first}\n## Later\n\nKeep this.\n`);
    const edited = read("AGENTS.md").replace("kb_upsert", "kb_upsert (old)");
    write("AGENTS.md", edited);
    expect(writeAgentInstructions(root).agents).toBe("updated");
    expect(read("AGENTS.md")).toBe(`${first}\n## Later\n\nKeep this.\n`);
    expect(writeAgentInstructions(root).agents).toBe("unchanged");
  });

  test("write once through a link between AGENTS.md and CLAUDE.md, and never through a link that leaves the repository", () => {
    write("CLAUDE.md", "# Shared\n");
    symlinkSync("CLAUDE.md", path.join(root, "AGENTS.md"));
    expect(writeAgentInstructions(root)).toEqual({
      agents: "updated",
      claude: "same-file",
    });
    expect(read("CLAUDE.md").match(/BEGIN kibi-managed/g)).toHaveLength(1);

    const outside = mkdtempSync(path.join(os.tmpdir(), "kibi-outside-"));
    try {
      writeFileSync(path.join(outside, "AGENTS.md"), "outside\n");
      rmSync(path.join(root, "AGENTS.md"));
      symlinkSync(
        path.join(outside, "AGENTS.md"),
        path.join(root, "AGENTS.md"),
      );
      expect(writeAgentInstructions(root).agents).toBe("skipped-symlink");
      expect(readFileSync(path.join(outside, "AGENTS.md"), "utf8")).toBe(
        "outside\n",
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("prepare script", () => {
  test("is added, appended after an existing step, kept, and removed without losing other steps", () => {
    expect(syncPrepareScript(root, true)).toBe("no-package-json");
    write("package.json", '{"name":"demo"}\n');
    expect(syncPrepareScript(root, true)).toBe("added");
    expect((packageJson().scripts as Record<string, string>).prepare).toBe(
      KIBI_PREPARE_COMMAND,
    );
    expect(syncPrepareScript(root, true)).toBe("present");
    expect(syncPrepareScript(root, false)).toBe("removed");
    expect(packageJson().scripts).toEqual({});

    write(
      "package.json",
      JSON.stringify({ scripts: { prepare: "husky", build: "tsc" } }),
    );
    expect(syncPrepareScript(root, true)).toBe("appended");
    expect((packageJson().scripts as Record<string, string>).prepare).toBe(
      `husky && ${KIBI_PREPARE_COMMAND}`,
    );
    expect(syncPrepareScript(root, false)).toBe("removed");
    expect(packageJson().scripts).toEqual({ build: "tsc", prepare: "husky" });
  });

  test("installs the hooks when kibi-cli is installed and exits 0 silently when it is not", () => {
    gitRepo();
    write("package.json", '{"name":"demo"}\n');
    expect(kibi(["init"]).status).toBe(0);
    rmSync(path.join(root, ".git", "hooks", "pre-commit"));
    const prepare = (packageJson().scripts as Record<string, string>).prepare;

    // npm runs the script through a shell in the package directory.
    const without = run("sh", ["-c", prepare]);
    expect(without.status).toBe(0);
    expect(`${without.stdout}${without.stderr}`).toBe("");
    expect(existsSync(path.join(root, ".git", "hooks", "pre-commit"))).toBe(
      false,
    );

    mkdirSync(path.join(root, "node_modules"));
    symlinkSync(cliPackage, path.join(root, "node_modules", "kibi-cli"));
    const ci = run("sh", ["-c", prepare], { CI: "true" });
    expect(ci.status).toBe(0);
    expect(existsSync(path.join(root, ".git", "hooks", "pre-commit"))).toBe(
      false,
    );

    const installed = run("sh", ["-c", prepare]);
    expect(installed.status).toBe(0);
    expect(installed.stdout).toContain("kibi: installed git hooks");
    expect(read(".git/hooks/pre-commit")).toContain("check --staged");
  }, 120_000);
});

describe("kibi hooks install --quiet", () => {
  test("does nothing and succeeds outside a Git work tree, before kibi init, and where a hook manager owns the hooks", () => {
    const outside = kibi(["hooks", "install", "--quiet"]);
    expect(outside.status).toBe(0);
    expect(outside.stdout).toBe("");

    gitRepo();
    const uninitialized = kibi(["hooks", "install", "--quiet"]);
    expect(uninitialized.status).toBe(0);
    expect(uninitialized.stdout).toBe("");

    expect(kibi(["init", "--no-hooks"]).status).toBe(0);
    write("lefthook.yml", "pre-commit:\n  commands: {}\n");
    const managed = kibi(["hooks", "install", "--quiet"]);
    expect(managed.status).toBe(0);
    expect(existsSync(path.join(root, ".git", "hooks", "pre-commit"))).toBe(
      false,
    );
  }, 120_000);
});

describe("kibi init", () => {
  test("records the default choices and sets up a repository so a fresh clone has instructions and a hook install", () => {
    gitRepo();
    write("package.json", '{"name":"demo"}\n');
    const init = kibi(["init"]);
    expect(init.status).toBe(0);
    expect((packageJson().kibi as Record<string, unknown>).setup).toEqual(
      DEFAULT_SETUP_CHOICES,
    );
    expect(read("AGENTS.md")).toContain("kb_search");
    expect(read("CLAUDE.md")).toContain("@AGENTS.md");
    expect((packageJson().scripts as Record<string, string>).prepare).toBe(
      KIBI_PREPARE_COMMAND,
    );
    expect(existsSync(path.join(root, ".github"))).toBe(false);
  }, 120_000);

  test("records opt-outs, undoes what they turn off, and keeps them on a later plain init", () => {
    gitRepo();
    write("package.json", '{"name":"demo"}\n');
    expect(kibi(["init"]).status).toBe(0);
    expect(
      kibi(["init", "--no-prepare-hooks", "--no-auto-sync", "--ci-gate"])
        .status,
    ).toBe(0);
    expect((packageJson().kibi as Record<string, unknown>).setup).toEqual({
      autoSync: false,
      prepareHooks: false,
      agentInstructions: true,
      ciGate: true,
    });
    expect(packageJson().scripts).toEqual({});
    expect(read(".github/workflows/kibi-check.yml")).toContain(
      "npm exec -- kibi check",
    );

    expect(kibi(["init"]).status).toBe(0);
    expect(packageJson().scripts).toEqual({});
    expect(
      (packageJson().kibi as { setup: { autoSync: boolean } }).setup.autoSync,
    ).toBe(false);
  }, 120_000);

  test("writes no agent files when they are declined", () => {
    gitRepo();
    expect(kibi(["init", "--no-agent-instructions"]).status).toBe(0);
    expect(existsSync(path.join(root, "AGENTS.md"))).toBe(false);
    expect(existsSync(path.join(root, "CLAUDE.md"))).toBe(false);
    expect(JSON.parse(read(".kb/setup.json"))).toMatchObject({
      agentInstructions: false,
    });
  }, 120_000);

  test("leaves the prepare script alone when a hook manager owns the hooks", () => {
    gitRepo();
    write("package.json", '{"name":"demo"}\n');
    write("lefthook.yml", "pre-commit:\n  commands: {}\n");
    expect(kibi(["init"]).status).toBe(0);
    expect(packageJson().scripts).toBeUndefined();
  }, 120_000);

  test("doctor warns when a recorded choice is not in place", () => {
    gitRepo();
    write("package.json", '{"name":"demo"}\n');
    expect(kibi(["init"]).status).toBe(0);
    rmSync(path.join(root, "AGENTS.md"));
    const doctor = kibi(["doctor"]);
    expect(doctor.stdout).toContain("Fresh-clone setup");
    expect(doctor.stdout).toContain("AGENTS.md has no Kibi section");
  }, 120_000);
});
