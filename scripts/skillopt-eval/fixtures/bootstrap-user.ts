/** Fictional user-owned facts, independent of evaluator rubrics and answers. */
// implements REQ-skillopt-codex-optimization
export const BOOTSTRAP_USER_CONTEXT = {
  projectSummary: "A fictional library lending desk tracks loans and returns.",
  knowledgeSources: [
    {
      id: "library-policy",
      kind: "specification" as const,
      title: "Library policy",
      locator: "documentation/library-policy.md",
      authority: "authoritative" as const,
    },
  ],
  intentClaims: [
    {
      sourceId: "library-policy",
      reference: "loan-due-date",
      statement: "Loans must retain a due date.",
      excerpt: "Loans must retain a due date.",
    },
  ],
};

// implements REQ-skillopt-codex-optimization
export function bootstrapUserProfile(mode: "approve" | "decline") {
  return {
    mode,
    contextAnswer:
      "Here is my project documentation: [Library policy](documentation/library-policy.md). Please open and read that Markdown file. It is current and authoritative; use its due-date rule for the initial scope. I have no tracker, other documents or established verification command. Show me the plan before making changes.",
    bootstrapContext: structuredClone(BOOTSTRAP_USER_CONTEXT),
  };
}

// implements REQ-skillopt-codex-optimization
export function bootstrapUserMode(
  taskId: string,
): "approve" | "decline" | undefined {
  const match =
    /^kibi-bootstrap-(bootstrap-analysis|bounded-context-questions|approval-plan-apply)-(train|development)-[1-9]\d*$/.exec(
      taskId,
    );
  return match
    ? match[1] === "approval-plan-apply"
      ? "approve"
      : "decline"
    : undefined;
}

// implements REQ-skillopt-codex-optimization
export function bootstrapDialogueInstruction(
  objective: string,
  split: string,
): string | undefined {
  if (split === "held-out") return undefined;
  const instruction = {
    bootstrap_analysis:
      "Analyze the initialized thin repository and produce a read-only bootstrap plan.",
    bounded_context_questions:
      "Ask only the bounded context questions needed before bootstrap synthesis, then produce a read-only plan using the answers.",
    approved_plan_apply:
      "Ask the operator which project documentation is available, read the supplied document, and prepare a bootstrap plan. Ask the operator to approve that exact preview, then apply only if approved and validate the result.",
  }[objective];
  return instruction === undefined
    ? undefined
    : `${instruction} The operator is available through skillopt_ask_user: use it for context questions and plan approval, and continue using its answers in this session. Do not infer approval from the task or fixture files. At most four user exchanges are available; combine related context questions.`;
}
