export {};

const child = Bun.spawn(
  [
    "bun",
    "test",
    "--timeout",
    "15000",
    "./scripts/skillopt-eval/tests/preflight.test.ts",
    ...process.argv.slice(2),
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
);

process.exitCode = await child.exited;
