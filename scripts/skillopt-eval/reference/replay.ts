/**
 * A recorded reference answer: the ordered tool calls and file edits of a
 * trajectory, the final contents of the files it edited, and its answer.
 * Calls are replayed as recorded, including ones the server rejected, so the
 * replay is the trajectory that earned its score.
 */
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { ReferenceScript } from "./runner";

const JsonObjectSchema = z.record(z.string(), z.unknown());

export const RecordedReferenceSchema = z
  .object({
    taskId: z.string().min(1),
    source: z.string().min(1),
    steps: z.array(
      z.union([
        z.object({ call: z.string().min(1), args: JsonObjectSchema }).strict(),
        z.object({ edit: z.string().min(1) }).strict(),
      ]),
    ),
    files: z.record(z.string(), z.string()),
    answer: z.string().min(1),
  })
  .strict();

export type RecordedReference = z.infer<typeof RecordedReferenceSchema>;

export async function readRecordedReference(
  path: string,
): Promise<RecordedReference> {
  return RecordedReferenceSchema.parse(
    JSON.parse(await readFile(path, "utf8")),
  );
}

export function replayScript(reference: RecordedReference): ReferenceScript {
  return async (agent) => {
    for (const step of reference.steps) {
      if ("call" in step) {
        await agent.raw(step.call, step.args);
        continue;
      }
      const content = reference.files[step.edit];
      if (content === undefined)
        throw new Error(`recorded edit of ${step.edit} has no final content`);
      await agent.edit(step.edit, content);
    }
    return reference.answer;
  };
}
