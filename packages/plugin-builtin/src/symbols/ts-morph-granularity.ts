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

import type { SourceSymbolKind } from "kibi-plugin-sdk";
import { Project } from "ts-morph";
import { chooseScriptKind, isPrivateClassMember } from "./ts-morph-shared.js";

// implements REQ-capability-plugin-builtin-parity-v1
export interface GranularitySymbolCandidate {
  readonly name: string;
  readonly kind: SourceSymbolKind;
}

/**
 * Collect exported (and unique bare method) symbol candidates used by
 * coarse-vs-granular symbol validation.
 */
// implements REQ-capability-plugin-builtin-parity-v1
export function collectGranularityCandidates(
  filePath: string,
  content: string,
): GranularitySymbolCandidate[] {
  const source = new Project({
    skipAddingFilesFromTsConfig: true,
  }).createSourceFile(`${filePath}::granularity`, content, {
    overwrite: true,
    scriptKind: chooseScriptKind(filePath),
  });
  const found: GranularitySymbolCandidate[] = [];
  const methodCounts = new Map<string, number>();
  const bareMethods = new Map<string, GranularitySymbolCandidate>();
  for (const fn of source.getFunctions()) {
    const name = fn.getName();
    if (fn.isExported() && name) found.push({ name, kind: "function" });
  }
  for (const cls of source.getClasses()) {
    if (!cls.isExported()) continue;
    const className = cls.getName();
    if (className) found.push({ name: className, kind: "class" });
    for (const method of cls.getMethods()) {
      if (isPrivateClassMember(method)) continue;
      const name = method.getName();
      if (className)
        found.push({ name: `${className}.${name}`, kind: "method" });
      bareMethods.set(name, { name, kind: "method" });
      methodCounts.set(name, (methodCounts.get(name) ?? 0) + 1);
    }
    for (const property of cls.getProperties()) {
      if (isPrivateClassMember(property)) continue;
      const name = property.getName();
      if (className)
        found.push({ name: `${className}.${name}`, kind: "property" });
    }
    for (const accessor of [
      ...cls.getGetAccessors(),
      ...cls.getSetAccessors(),
    ]) {
      if (isPrivateClassMember(accessor)) continue;
      const name = accessor.getName();
      if (className)
        found.push({ name: `${className}.${name}`, kind: "accessor" });
    }
  }
  for (const [name, count] of methodCounts) {
    const method = bareMethods.get(name);
    if (count === 1 && method) found.push(method);
  }
  for (const item of source.getInterfaces()) {
    if (item.isExported())
      found.push({ name: item.getName(), kind: "interface" });
  }
  for (const item of source.getTypeAliases()) {
    if (item.isExported()) found.push({ name: item.getName(), kind: "type" });
  }
  for (const item of source.getEnums()) {
    if (item.isExported()) found.push({ name: item.getName(), kind: "enum" });
  }
  for (const statement of source.getVariableStatements()) {
    if (!statement.isExported()) continue;
    for (const declaration of statement.getDeclarations()) {
      found.push({ name: declaration.getName(), kind: "variable" });
    }
  }
  return found.sort((left, right) => left.name.localeCompare(right.name));
}
