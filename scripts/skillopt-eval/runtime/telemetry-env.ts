/**
 * Environment for every process the evaluation harness starts. Fixture setup,
 * scoring and broker processes run the installed Kibi CLI, which would
 * otherwise send their operations as release usage; `KIBI_TELEMETRY=0` keeps
 * evaluation traffic out of product telemetry on every host.
 */
export function harnessChildEnv(
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return { ...base, KIBI_TELEMETRY: "0" };
}
