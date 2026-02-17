import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function branchEnsureCommand(): Promise<void> {
  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  const kbPath = path.join(process.cwd(), ".kb/branches", branch);
  const mainPath = path.join(process.cwd(), ".kb/branches/main");

  if (!fs.existsSync(mainPath)) {
    console.warn(
      "Warning: main branch KB does not exist, skipping branch ensure",
    );
    return;
  }

  if (!fs.existsSync(kbPath)) {
    fs.cpSync(mainPath, kbPath, { recursive: true });
    console.log(`Created branch KB: ${branch}`);
  } else {
    console.log(`Branch KB already exists: ${branch}`);
  }
}

export default branchEnsureCommand;
