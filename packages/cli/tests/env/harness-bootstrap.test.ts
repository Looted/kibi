// implements REQ-002
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mcpRoot = path.resolve(cliRoot, "../mcp");
const originalCwd = process.cwd();

let workspace = "";
let userConfigRoot = "";

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-env-harness-"));
  userConfigRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-env-harness-user-"));
  fs.mkdirSync(path.join(workspace, ".kb"), { recursive: true });
  fs.mkdirSync(path.join(workspace, ".git"), { recursive: true });
  fs.mkdirSync(path.join(userConfigRoot, "kibi"), { recursive: true });
  fs.writeFileSync(
    path.join(userConfigRoot, "kibi", "env"),
    "HARNESS_USER=from-user\n",
  );
  fs.writeFileSync(
    path.join(workspace, ".env.kibi"),
    "HARNESS_PROJECT=from-project\nHARNESS_USER=project-override\n",
  );
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.rmSync(userConfigRoot, { recursive: true, force: true });
});

function runBootstrapScript(options: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  moduleSpecifier: string;
  call: string;
}): { status: number | null; stdout: string; stderr: string } {
  const script = `
    import { ${options.call} } from ${JSON.stringify(options.moduleSpecifier)};
    const result = ${options.call}({
      startDir: process.cwd(),
      xdgConfigHome: process.env.XDG_CONFIG_HOME,
    });
    process.stdout.write(JSON.stringify({
      HARNESS_USER: process.env.HARNESS_USER,
      HARNESS_PROJECT: process.env.HARNESS_PROJECT,
      sources: {
        HARNESS_USER: result.sources?.HARNESS_USER,
        HARNESS_PROJECT: result.sources?.HARNESS_PROJECT,
      },
      projectEnvPath: result.projectEnvPath,
      userEnvPath: result.userEnvPath,
      workspaceRoot: result.workspaceRoot,
    }));
  `;
  const ran = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
  });
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr };
}

describe("harness-independent env bootstrap", () => {
  function baseEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      XDG_CONFIG_HOME: userConfigRoot,
    };
    for (const key of [
      "KIBI_ENV_FILE",
      "KIBI_WORKSPACE",
      "KIBI_PROJECT_ROOT",
      "KIBI_ROOT",
      "HARNESS_USER",
      "HARNESS_PROJECT",
    ]) {
      Reflect.deleteProperty(env, key);
    }
    return env;
  }

  test("CLI and MCP attribution match for the same files (cwd = workspace)", () => {
    const env = baseEnv();
    const cli = runBootstrapScript({
      cwd: workspace,
      env,
      moduleSpecifier: path.join(cliRoot, "src/env/bootstrap.ts"),
      call: "bootstrapKibiEnvironment",
    });
    expect(cli.stderr).toBe("");
    expect(cli.status).toBe(0);
    const cliPayload = JSON.parse(cli.stdout) as {
      HARNESS_USER: string;
      HARNESS_PROJECT: string;
      sources: { HARNESS_USER: string; HARNESS_PROJECT: string };
    };

    const mcpScript = `
      import { loadDefaultEnvFile } from ${JSON.stringify(path.join(mcpRoot, "src/env.ts"))};
      import { inspectSecretSource } from ${JSON.stringify(path.join(cliRoot, "src/env/bootstrap.ts"))};
      loadDefaultEnvFile();
      process.stdout.write(JSON.stringify({
        HARNESS_USER: process.env.HARNESS_USER,
        HARNESS_PROJECT: process.env.HARNESS_PROJECT,
        sources: {
          HARNESS_USER: inspectSecretSource("HARNESS_USER"),
          HARNESS_PROJECT: inspectSecretSource("HARNESS_PROJECT"),
        },
      }));
    `;
    const mcpRan = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", mcpScript],
      { cwd: workspace, env, encoding: "utf8" },
    );
    expect(mcpRan.stderr).toBe("");
    expect(mcpRan.status).toBe(0);
    const mcpPayload = JSON.parse(mcpRan.stdout) as {
      HARNESS_USER: string;
      HARNESS_PROJECT: string;
      sources: { HARNESS_USER: string; HARNESS_PROJECT: string };
    };

    expect(cliPayload.HARNESS_USER).toBe("project-override");
    expect(cliPayload.HARNESS_PROJECT).toBe("from-project");
    expect(mcpPayload.HARNESS_USER).toBe(cliPayload.HARNESS_USER);
    expect(mcpPayload.HARNESS_PROJECT).toBe(cliPayload.HARNESS_PROJECT);
    expect(mcpPayload.sources.HARNESS_PROJECT).toBe("project_env");
    expect(mcpPayload.sources.HARNESS_USER).toBe("project_env");
  });

  test("MCP bootstrap with explicit KIBI_WORKSPACE and different cwd", () => {
    const otherCwd = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-env-other-cwd-"));
    try {
      const env = baseEnv();
      env.KIBI_WORKSPACE = workspace;

      const script = `
        import { loadDefaultEnvFile } from ${JSON.stringify(path.join(mcpRoot, "src/env.ts"))};
        import { inspectSecretSource } from ${JSON.stringify(path.join(cliRoot, "src/env/bootstrap.ts"))};
        const loaded = loadDefaultEnvFile();
        process.stdout.write(JSON.stringify({
          HARNESS_PROJECT: process.env.HARNESS_PROJECT,
          source: inspectSecretSource("HARNESS_PROJECT"),
          envFilePath: loaded.envFilePath,
        }));
      `;
      const ran = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", script],
        { cwd: otherCwd, env, encoding: "utf8" },
      );
      expect(ran.stderr).toBe("");
      expect(ran.status).toBe(0);
      const payload = JSON.parse(ran.stdout) as {
        HARNESS_PROJECT: string;
        source: string;
        envFilePath: string;
      };
      expect(payload.HARNESS_PROJECT).toBe("from-project");
      expect(payload.source).toBe("project_env");
      expect(payload.envFilePath).toBe(path.join(workspace, ".env.kibi"));
    } finally {
      fs.rmSync(otherCwd, { recursive: true, force: true });
    }
  });
});
