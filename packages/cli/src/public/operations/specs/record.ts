import { executeRecord } from "../../../operations/mutation/record-execute.js";
import type { RecordPayload } from "../../../operations/mutation/record-execute.js";
import {
  type RecordInput,
  SAID_BY,
} from "../../../operations/mutation/record.js";
import type { OperationSpec } from "../types.js";

export const recordSpec = {
  name: "kb_record",
  cliName: "record",
  description:
    "Record a rule as it is stated: statement, why, saidBy, quote, code and an optional test. Kibi writes it as one kb_upsert payload and returns the commit gate's verdict (commitAllowed, findings with blocks) and the steps left as nextActions. dryRun:true returns the payload and writes nothing. Facts, links, updates and other modeling: kb_upsert.",
  businessInputSchema: {
    type: "object",
    required: ["statement", "why", "saidBy", "code"],
    properties: {
      statement: {
        type: "string",
        minLength: 1,
        pattern: "\\S",
        description: "The rule as one testable must sentence.",
      },
      why: {
        type: "string",
        minLength: 1,
        description:
          "Why it exists, in their words; 'Reason not stated' if none given.",
      },
      saidBy: {
        type: "string",
        enum: [...SAID_BY],
        description: "user or maintainer (firm), or agent (default).",
      },
      quote: {
        type: "string",
        minLength: 1,
        description:
          "Their words, recorded as origin.ref; a firm rule needs one.",
      },
      code: {
        type: "array",
        minItems: 1,
        description: "Declarations that implement it, each {file, symbol}.",
        items: {
          type: "object",
          required: ["file", "symbol"],
          properties: {
            file: { type: "string", minLength: 1 },
            symbol: { type: "string", minLength: 1 },
          },
        },
      },
      test: {
        type: "string",
        minLength: 1,
        description: "An existing TEST id that checks it.",
      },
      dryRun: {
        type: "boolean",
        description: "Return the kb_upsert payload; write nothing.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-write", "workspace-write"],
  execute: executeRecord,
} as const satisfies OperationSpec<RecordInput, RecordPayload>;
