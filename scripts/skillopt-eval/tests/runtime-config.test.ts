import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCodexSandboxProbeArgv,
  probeCodexSandbox,
  sourceIsolationDeniedPaths,
} from "../runtime/canary-runtime";
import {
  CodexAuthError,
  isolatedCodexEnvironment,
  prepareExistingLogin,
} from "../runtime/codex-auth";
import { buildCodexConfig, buildCodexExecArgv } from "../runtime/permissions";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function directories() {
  const root = await mkdtemp(join(tmpdir(), "skillopt-auth-test-"));
  roots.push(root);
  const real = join(root, "real");
  const privateHome = join(root, "private");
  await Promise.all([mkdir(real), mkdir(privateHome)]);
  return { root, real, privateHome } as const;
}

const successfulLogin = async (argv: readonly [string, ...string[]]) => ({
  argv,
  stdout: "",
  stderr: "Logged in using ChatGPT\n",
  exitCode: 0,
  signal: null,
});

describe("Codex existing-login isolation", () => {
  test("copies only file credentials with restrictive permissions", async () => {
    // Given
    const paths = await directories();
    const chatGptAuth = JSON.stringify({
      auth_mode: "chatgpt",
      OPENAI_API_KEY: null,
      tokens: { access_token: "session-token" },
    });
    await writeFile(join(paths.real, "auth.json"), chatGptAuth, {
      mode: 0o644,
    });
    await writeFile(join(paths.real, "config.toml"), "ambient = true");

    // When
    const auth = await prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    expect(auth.mode).toBe("file");
    expect(await readFile(join(paths.privateHome, "auth.json"), "utf8")).toBe(
      chatGptAuth,
    );
    expect(
      (await stat(join(paths.privateHome, "auth.json"))).mode & 0o777,
    ).toBe(0o600);
    expect(Bun.file(join(paths.privateHome, "config.toml")).size).toBe(0);
  });

  test("uses keyring without copying credentials", async () => {
    // Given
    const paths = await directories();

    // When
    const auth = await prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    expect(auth.mode).toBe("keyring");
    expect(Bun.file(join(paths.privateHome, "auth.json")).size).toBe(0);
  });

  test("rejects API-key-backed auth files", async () => {
    // Given
    const paths = await directories();
    await writeFile(
      join(paths.real, "auth.json"),
      JSON.stringify({ auth_mode: "apikey", OPENAI_API_KEY: "secret" }),
    );

    // When
    const attempt = prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    await expect(attempt).rejects.toMatchObject({
      name: "CodexAuthError",
      kind: "auth_file",
    });
  });

  test("rejects API-key-backed keyring sessions", async () => {
    // Given
    const paths = await directories();

    // When
    const attempt = prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: async (argv: readonly [string, ...string[]]) => ({
        argv,
        stdout: "",
        stderr: "Logged in using an API key\n",
        exitCode: 0,
        signal: null,
      }),
    });

    // Then
    await expect(attempt).rejects.toMatchObject({
      name: "CodexAuthError",
      kind: "login",
    });
  });

  test("rejects API keys and alternate provider configuration", async () => {
    // Given
    const paths = await directories();

    // When
    const attempts = [
      { OPENAI_API_KEY: "secret" },
      { CODEX_API_KEY: "secret" },
      { ANTHROPIC_API_KEY: "secret" },
      { MISTRAL_API_KEY: "secret" },
      { OPENAI_BASE_URL: "https://provider.invalid" },
    ].map((env) =>
      prepareExistingLogin({
        privateCodexHome: paths.privateHome,
        env: { ...env, CODEX_HOME: paths.real },
        run: successfulLogin,
      }),
    );

    // Then
    for (const attempt of attempts) {
      await expect(attempt).rejects.toBeInstanceOf(CodexAuthError);
    }
  });

  test("keeps private CODEX_HOME separate from the writable sandbox home", async () => {
    // Given
    const paths = await directories();
    const sandboxHome = join(paths.root, "sandbox-home");
    await mkdir(sandboxHome);

    // When
    const env = isolatedCodexEnvironment(
      { PATH: process.env.PATH, CODEX_HOME: paths.real },
      paths.privateHome,
      sandboxHome,
    );

    // Then
    expect(env.CODEX_HOME).toBe(paths.privateHome);
    expect(env.HOME).toBe(sandboxHome);
    expect(env.USERPROFILE).toBe(sandboxHome);
    expect(env.XDG_CONFIG_HOME).toBe(join(sandboxHome, "xdg-config"));
    expect(env.XDG_CACHE_HOME).toBe(join(sandboxHome, "xdg-cache"));
    expect(env.XDG_DATA_HOME).toBe(join(sandboxHome, "xdg-data"));
  });
});

describe("Codex evaluator-owned permissions", () => {
  test("builds exact noninteractive argv", () => {
    // Given
    const options = {
      codexCommand: "/bin/codex",
      workspace: "/run/work",
      outputSchema: "/run/schema.json",
      role: "target" as const,
    };

    // When
    const argv = buildCodexExecArgv(options);

    // Then
    expect(argv).toEqual([
      "/bin/codex",
      "--ask-for-approval",
      "never",
      "exec",
      "--json",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-rules",
      "--strict-config",
      "--model",
      "gpt-5.4-mini",
      "--cd",
      "/run/work",
      "--output-schema",
      "/run/schema.json",
      "-",
    ]);
  });

  test("builds an offline production-profile sandbox probe", () => {
    // Given
    const options = {
      codexCommand: "/run/work/.runtime/codex",
      workspace: "/run/work",
    } as const;

    // When
    const argv = buildCodexSandboxProbeArgv(options);

    // Then
    expect(argv).toEqual([
      "/run/work/.runtime/codex",
      "sandbox",
      "--permission-profile",
      "skillopt-isolated",
      "--cd",
      "/run/work",
      "/bin/sh",
      "-c",
      "printf skillopt-sandbox-probe:pass",
    ]);
  });

  test("accepts sandbox success with non-fatal stderr diagnostics", async () => {
    // Given
    const argv = buildCodexSandboxProbeArgv({
      codexCommand: "/run/work/.runtime/codex",
      workspace: "/run/work",
    });

    // When
    const attempt = probeCodexSandbox({
      codexCommand: argv[0],
      workspace: "/run/work",
      env: { PATH: "/usr/bin:/bin" },
      run: async () => ({
        argv,
        stdout: "skillopt-sandbox-probe:pass",
        stderr: "warning\n",
        exitCode: 0,
        signal: null,
      }),
    });

    // Then
    expect(await attempt).toBeUndefined();
  });

  test("classifies a production source probe failure as a prerequisite", async () => {
    // Given
    const probe = {
      absolutePath: "/run/work/.runtime/canary-probe",
      command: "./.runtime/canary-probe",
      expectedOutput: "skillopt-capability-canary:pass\n",
      sha256: "probe-sha",
    } as const;

    // When
    const attempt = probeCodexSandbox({
      codexCommand: "/run/work/.runtime/codex",
      workspace: "/run/work",
      env: { PATH: "/usr/bin:/bin" },
      probe,
      run: async (argv: readonly [string, ...string[]]) => ({
        argv,
        stdout: "",
        stderr: "source path readable\n",
        exitCode: 41,
        signal: null,
      }),
    });

    // Then
    await expect(attempt).rejects.toMatchObject({
      name: "RuntimePrerequisiteError",
      message: "source_isolation_probe_failed",
    });
  });

  test("denies every private path and requires the exact Kibi server", () => {
    // Given
    const paths = {
      workspace: "/run/work",
      runPrivateHome: "/run/home",
      realCodexHome: "/home/user/.codex",
      sourceWorktree: "/source",
      fixtureKb: "/run/work/.kb",
      privateScorer: "/run/scorer",
      privateEvidence: "/run/evidence",
      siblingRuns: "/run/sibling",
    } as const;

    // When
    const config = buildCodexConfig({
      role: "target",
      authMode: "file",
      paths,
      bwrapExecutable: "/run/work/.runtime/codex-resources/bwrap",
      codexExecutable: "/run/work/.runtime/codex",
      mcpServer: {
        command: "/run/work/.runtime/mcp/broker/bun",
        args: ["/run/work/.runtime/mcp/broker/broker.js"],
        cwd: paths.workspace,
      },
    });

    // Then
    expect(config).toContain('":root" = "deny"');
    expect(config).toContain('":tmpdir" = "deny"');
    expect(config).toContain('":slash_tmp" = "deny"');
    expect(config).toContain(
      '"/run/work/.runtime/codex-resources/bwrap" = "read"',
    );
    expect(config).toContain('".kb" = "deny"');
    expect(config).toContain(`${JSON.stringify(paths.fixtureKb)} = "deny"`);
    expect(config).not.toContain(
      `${JSON.stringify(paths.sourceWorktree)} = "deny"`,
    );
    for (const runtimePrivatePath of [
      paths.runPrivateHome,
      paths.realCodexHome,
      paths.privateScorer,
      paths.privateEvidence,
      paths.siblingRuns,
    ]) {
      expect(config).not.toContain(
        `${JSON.stringify(runtimePrivatePath)} = "deny"`,
      );
    }
    expect(config).toContain(`${JSON.stringify(paths.workspace)} = true`);
    expect(config).toContain('command = "/run/work/.runtime/mcp/broker/bun"');
    expect(config).toContain(
      'args = ["/run/work/.runtime/mcp/broker/broker.js"]',
    );
    expect(config).toContain('cwd = "/run/work"');
    expect(config).not.toContain(
      '"/run/work/.runtime/mcp/broker/bun" = "read"',
    );
    expect(config).not.toContain('"/source/packages/');
    expect(config).not.toContain('"/source/node_modules');
    expect(config).toContain("required = true");
    expect(config).toContain('default_tools_approval_mode = "approve"');
    expect(config).toContain('"KIBI_BRANCH"');
    expect(config).toContain("enabled = false");
    expect(config).toContain("allow_upstream_proxy = false");
    expect(config).toContain("allow_local_binding = false");
    expect(config).not.toContain("danger-full-access");
    expect(config).not.toContain("prompt");
  });

  test("keeps optimizer MCP tools on annotation-based automatic approval", () => {
    const paths = {
      workspace: "/run/work",
      runPrivateHome: "/run/home",
      realCodexHome: "/home/user/.codex",
      sourceWorktree: "/source",
      fixtureKb: "/run/work/.kb",
      privateScorer: "/run/scorer",
      privateEvidence: "/run/evidence",
      siblingRuns: "/run/sibling",
    } as const;

    const config = buildCodexConfig({
      role: "optimizer",
      authMode: "file",
      paths,
      bwrapExecutable: "/run/work/.runtime/codex-resources/bwrap",
      codexExecutable: "/run/work/.runtime/codex",
      mcpServer: {
        command: "/run/work/.runtime/mcp/broker/bun",
        args: ["/run/work/.runtime/mcp/broker/broker.js"],
        cwd: paths.workspace,
      },
    });

    expect(config).toContain('default_tools_approval_mode = "auto"');
  });

  test("denies private Codex secrets without forbidding the arg0 helper mount", () => {
    const workspace = {
      root: "/run/root",
      codexHome: "/run/root/codex-home",
      sandboxHome: "/run/root/workspace/.sandbox-home",
      target: "/run/root/workspace",
      privateEvidence: "/run/root/private-evidence",
      privateScorer: "/run/root/private-scorer",
      siblingRun: "/run/root/sibling-run",
      cleanup: async () => {},
    } as const;

    const denied = sourceIsolationDeniedPaths(
      workspace,
      "/source",
      "/home/user/.codex",
    );

    expect(denied).toContain("/home/user/.codex/auth.json");
    expect(denied).toContain("/run/root/codex-home/auth.json");
    expect(denied).toContain("/run/root/codex-home/config.toml");
    expect(denied).not.toContain("/run/root/codex-home");
    expect(denied).toContain("/tmp");
    expect(denied).toContain("/var/tmp");
  });
});
