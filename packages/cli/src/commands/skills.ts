import { createHash } from "node:crypto";
import Table from "cli-table3";
import type { CommandResult } from "../cli.js";
import {
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
  validateSkillBundle,
  type SkillManifest,
  type SkillValidationError,
} from "kibi-cli/skills";

interface FormatOptions<TFormat extends string> {
  format?: TFormat;
}

type ListFormat = "json" | "table";
type LoadFormat = "json" | "markdown";
type ReadFormat = "text" | "json";
type ValidateFormat = "json" | "table";

// implements REQ-003
export async function skillsListCommand(
  options: FormatOptions<ListFormat>,
): Promise<CommandResult | undefined> {
  return handleSkillCommand(() => {
    const skills = listBundledSkills();
    if (options.format === "json") {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    console.log(renderSkillsTable(skills));
  });
}

export async function skillsLoadCommand(
  id: string,
  options: FormatOptions<LoadFormat>,
): Promise<CommandResult | undefined> {
  return handleSkillCommand(() => {
    const bundle = loadBundledSkill(id);
    if (options.format === "json") {
      console.log(JSON.stringify({
        metadata: bundle.manifest,
        body: bundle.body,
        resources: bundle.manifest.resources ?? [],
        contentHash: createHash("sha256").update(bundle.body).digest("hex"),
        sourceType: "bundled",
      }, null, 2));
      return;
    }

    process.stdout.write(bundle.body.endsWith("\n") ? bundle.body : `${bundle.body}\n`);
  });
}

export async function skillsReadCommand(
  id: string,
  resource: string,
  options: FormatOptions<ReadFormat>,
): Promise<CommandResult | undefined> {
  return handleSkillCommand(() => {
    const contents = readBundledSkillResource(id, resource);
    if (options.format === "json") {
      console.log(JSON.stringify({ id, resource, contents }, null, 2));
      return;
    }

    process.stdout.write(contents.endsWith("\n") ? contents : `${contents}\n`);
  });
}

export async function skillsValidateCommand(
  pathLike: string,
  options: FormatOptions<ValidateFormat>,
): Promise<CommandResult | undefined> {
  return handleSkillCommand(() => {
    const result = validateSkillBundle(pathLike);
    const printable = {
      valid: result.valid,
      errors: result.errors.map(formatValidationError),
    };

    if (options.format === "json") {
      console.log(JSON.stringify(printable, null, 2));
      return;
    }

    console.log(renderValidationTable(printable));
  });
}

function handleSkillCommand(action: () => void): CommandResult | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return { exitCode: 1 };
  }
}

function renderSkillsTable(skills: SkillManifest[]): string {
  const table = new Table({ head: ["ID", "Name", "Version", "Description"] });
  for (const skill of skills) {
    table.push([skill.id, skill.name, skill.version, skill.description]);
  }
  return table.toString();
}

function formatValidationError(error: SkillValidationError): {
  field: string;
  message: string;
} {
  return { field: error.field, message: error.message };
}

function renderValidationTable(result: {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}): string {
  const table = new Table({ head: ["Valid", "Field", "Message"] });
  if (result.errors.length === 0) {
    table.push([String(result.valid), "", ""]);
    return table.toString();
  }

  for (const error of result.errors) {
    table.push([String(result.valid), error.field, error.message]);
  }
  return table.toString();
}
