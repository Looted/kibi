import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OptimizationStep } from "./optimize";
import type { FrozenVariant } from "./variants";

export type SkillOptArtifactInput = Readonly<{
  baselineBody: string;
  bestSkill: FrozenVariant;
  steps: readonly OptimizationStep[];
  runtimeState: Readonly<Record<string, unknown>>;
}>;

// implements REQ-skillopt-codex-optimization
export async function persistSkillOptArtifacts(
  root: string,
  input: SkillOptArtifactInput,
): Promise<void> {
  const stepsRoot = join(root, "steps");
  const skillsRoot = join(root, "skills");
  await mkdir(stepsRoot, { recursive: true, mode: 0o700 });
  await mkdir(skillsRoot, { recursive: true, mode: 0o700 });
  await writeFile(join(skillsRoot, "skill_v0000.md"), input.baselineBody, {
    encoding: "utf8",
    mode: 0o600,
  });
  await Promise.all(
    input.steps.map(async ({ step, candidate, development }) => {
      const directory = join(stepsRoot, `step-${step}`);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(join(directory, "candidate_skill.md"), candidate.body, {
        encoding: "utf8",
        mode: 0o600,
      });
      await writeFile(
        join(skillsRoot, `skill_v${String(step).padStart(4, "0")}.md`),
        candidate.body,
        { encoding: "utf8", mode: 0o600 },
      );
      await writeFile(
        join(directory, "development.json"),
        `${JSON.stringify(development)}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    }),
  );
  await writeFile(join(root, "best_skill.md"), input.bestSkill.body, {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(
    join(root, "runtime_state.json"),
    `${JSON.stringify(input.runtimeState)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    join(root, "history.json"),
    `${JSON.stringify(input.steps)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}
