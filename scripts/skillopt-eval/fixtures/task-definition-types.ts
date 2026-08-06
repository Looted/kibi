import type {
  ActivationMode,
  AdversarialCase,
  ApprovalPhase,
  KnowledgeState,
  RepositoryState,
  WorktreeState,
} from "../catalog";

export type Definition = Readonly<{
  instruction: string;
  objectiveCode: string;
  sourceFile: string;
  mutation: "read-only" | "write";
  activationMode: ActivationMode;
  repository: RepositoryState;
  kb: KnowledgeState;
  worktree: WorktreeState;
  approvalPhase: ApprovalPhase;
  adversarialCases: readonly AdversarialCase[];
}>;
