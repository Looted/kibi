/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { copyFileSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { copyCleanSnapshot } from "../../utils/branch-resolver.js";

export async function prepareStagingEnvironment(
  stagingPath: string,
  livePath: string,
  rebuild: boolean,
): Promise<void> {
  // Cleanup any existing staging directory
  cleanupStaging(stagingPath);
  mkdirSync(stagingPath, { recursive: true });

  if (!rebuild && existsSync(livePath)) {
    // Use existing live path if available
    copyCleanSnapshot(livePath, stagingPath);
  } else {
    // Start fresh with schema only
    await copySchemaToStaging(stagingPath);
  }
}

async function copySchemaToStaging(stagingPath: string): Promise<void> {
  const possibleSchemaPaths = [
    path.resolve(process.cwd(), "node_modules", "kibi-cli", "schema"),
    path.resolve(process.cwd(), "..", "..", "schema"),
    path.resolve(import.meta.dirname || __dirname, "..", "..", "schema"),
    path.resolve(process.cwd(), "packages", "cli", "schema"),
  ];

  let schemaSourceDir: string | null = null;
  for (const p of possibleSchemaPaths) {
    if (existsSync(p)) {
      schemaSourceDir = p;
      break;
    }
  }

  if (!schemaSourceDir) {
    return;
  }

  const schemaFiles = await fg("*.pl", {
    cwd: schemaSourceDir,
    absolute: false,
  });

  const schemaDestDir = path.join(stagingPath, "schema");
  if (!existsSync(schemaDestDir)) {
    mkdirSync(schemaDestDir, { recursive: true });
  }

  for (const file of schemaFiles) {
    const sourcePath = path.join(schemaSourceDir, file);
    const destPath = path.join(schemaDestDir, file);
    copyFileSync(sourcePath, destPath);
  }
}

export function atomicPublish(stagingPath: string, livePath: string): void {
  const liveParent = path.dirname(livePath);
  if (!existsSync(liveParent)) {
    mkdirSync(liveParent, { recursive: true });
  }

  if (existsSync(livePath)) {
    const tempPath = `${livePath}.old.${Date.now()}`;
    renameSync(livePath, tempPath);
    renameSync(stagingPath, livePath);
    rmSync(tempPath, { recursive: true, force: true });
  } else {
    renameSync(stagingPath, livePath);
  }
}

export function cleanupStaging(stagingPath: string): void {
  if (existsSync(stagingPath)) {
    rmSync(stagingPath, { recursive: true, force: true });
  }
}
