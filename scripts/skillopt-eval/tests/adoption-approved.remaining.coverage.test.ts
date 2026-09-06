import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { AdoptionTransactionError } from "../adoption-types";
import { defaultRunMirrorSync } from "../adoption-approved";
import * as skills from "../../sync-agent-skills";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("adoption-approved remaining mirror-sync wrapping", () => {
  test("wraps mirror-sync failures in AdoptionTransactionError", async () => {
    const spy = spyOn(skills, "syncAgentSkillsUnlocked").mockImplementation(
      () => {
        throw new Error("mirror failed");
      },
    );
    spies.push(spy);
    await expect(defaultRunMirrorSync("/tmp/missing-skillopt-repo")).rejects.toBeInstanceOf(
      AdoptionTransactionError,
    );
  });
});
