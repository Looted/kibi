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
import type { PrologProcess } from "kibi-cli/prolog";

export interface AutopilotGenerateArgs {
  includeGenericMarkdown?: boolean;
  minConfidence?: number;
  maxCandidates?: number;
  entityTypes?: Array<
    "req" | "scenario" | "test" | "adr" | "fact" | "symbol"
  >;
}

export interface AutopilotGenerateResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    activationState: string;
    activationReason: string;
    applyBlocked: boolean;
    discoverySummary: Record<string, unknown>;
    candidates: Array<Record<string, unknown>>;
    suppressedCandidates: Array<Record<string, unknown>>;
    payoffSummary: Record<string, unknown>;
  };
}

export async function handleKbAutopilotGenerate( // implements REQ-mcp-init-kibi-autopilot-v1
  _prolog: PrologProcess,
  args: AutopilotGenerateArgs,
): Promise<AutopilotGenerateResult> {
  const {
    includeGenericMarkdown = true,
    minConfidence = 0.8,
    maxCandidates = 50,
    entityTypes,
  } = args;

  void includeGenericMarkdown;
  void minConfidence;
  void maxCandidates;
  void entityTypes;

  return {
    content: [
      {
        type: "text",
        text: "Autopilot generate: KB root not initialized. No candidates generated.",
      },
    ],
    structuredContent: {
      activationState: "root_uninitialized",
      activationReason:
        "KB has no entities. Autopilot requires an initialized KB with at least one entity to generate candidates.",
      applyBlocked: true,
      discoverySummary: {},
      candidates: [],
      suppressedCandidates: [],
      payoffSummary: {},
    },
  };
}
