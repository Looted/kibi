/** Fictional public evidence only; no project data or private task answers. */
// implements REQ-skillopt-codex-optimization
export function onboardingReviewEvidence(taskId: string) {
  const trackerOnly = taskId.includes("-train-1");
  const documentOnly = taskId.includes("-train-2");
  const obligations = [
    ...(!documentOnly
      ? [
          {
            reference: "LIB-1",
            sourceId: "tracker",
            kind: "intent",
            statement: "Loans must retain a due date.",
          },
        ]
      : []),
    ...(!trackerOnly
      ? [
          {
            reference: "GUIDE-1",
            sourceId: "guide",
            kind: "intent",
            statement: "Returns must release the reserved copy.",
          },
        ]
      : []),
  ];
  return {
    fictional: true,
    product: "Library lending desk",
    scope: "Review evidence only; do not apply the proposed plan.",
    obligations,
    otherMaterial: [
      {
        reference: "TEMPLATE-1",
        sourceId: "tooling",
        kind: "example",
        statement: "Example only: the system must deliver parcels by drone.",
      },
    ],
    plan: {
      status: "ready",
      candidates: [
        ...(trackerOnly
          ? [obligations[0]]
          : obligations.filter((row) => row.sourceId === "guide")),
        ...(!documentOnly
          ? [{ reference: "TEMPLATE-1", sourceId: "tooling", kind: "req" }]
          : []),
      ],
      suppressedCandidates:
        trackerOnly || documentOnly
          ? []
          : [{ reference: "LIB-1", reason: "over_limit" }],
    },
    execution: { applied: false, checkViolations: 0, proofReceipts: [] },
  };
}
