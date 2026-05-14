import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import { selectLatestPersistedBrief, markBriefTuiSeen, markBriefRead } from "./idle-brief-reader.js";
import { loadBriefConfig } from "kibi-cli/brief-config";
import { buildTuiBriefViewModel } from "./tui-brief-view-model.js";

const tui: TuiPlugin = async (api, _options, _meta) => {
  // State: track the currently displayed contentHash for in-place refresh detection
  let currentContentHash: string | null = null;

  api.route.register([
    {
      name: "kibi.brief",
      render: () => { // implements REQ-opencode-kibi-briefing-v6
        const workspace = api.state.path.worktree || "";
        const branch = api.state.vcs?.branch || "main";
        const brief = selectLatestPersistedBrief(workspace, branch);
        
        if (!brief) {
          currentContentHash = null;
          return (
            <box flexDirection="column" gap={1} padding={1}>
              <text fg={api.theme.current.error}>No meaningful KB update</text>
              <text>There is no latest persisted brief for this branch.</text>
            </box>
          );
        }

        const { envelope } = brief;
        const isNewContent = envelope.contentHash !== currentContentHash;
        currentContentHash = envelope.contentHash;

        // Mark as TUI-seen when this is a new (previously unseen) brief and it's unread
        if (isNewContent && envelope.unread) {
          markBriefTuiSeen(workspace, branch, envelope.contentHash);

          // When VSCode channel is disabled, TUI is the sole delivery channel —
          // viewing the brief here should also mark it as fully read
          try {
            const config = loadBriefConfig(workspace);
            if (!config.channels.vscode) {
              markBriefRead(workspace, brief.filePath);
            }
          } catch {
            // Gracefully handle config load or markBriefRead failures
          }
        }

        const viewModel = buildTuiBriefViewModel(envelope);

        return (
          <scrollbox flexDirection="column" gap={1} padding={1}>
            <text fg={api.theme.current.accent}><strong>{viewModel.title}</strong></text>
            
            <box flexDirection="column">
              <text><strong>What changed:</strong></text>
              <text>{viewModel.whatChanged.map((line) => `- ${line}`).join("\n")}</text>
            </box>

            <box flexDirection="column">
              <text><strong>Why it matters:</strong></text>
              <text>{viewModel.whyItMatters}</text>
            </box>

            {(viewModel.knowledgeImpact.citations.length > 0 || viewModel.knowledgeImpact.constraints.length > 0 || viewModel.knowledgeImpact.regressionRisks.length > 0) && (
              <box flexDirection="column">
                <text><strong>Project knowledge impact:</strong></text>
                {viewModel.knowledgeImpact.citations.length > 0 && (
                  <text>
                    {viewModel.knowledgeImpact.citations
                      .map((citation) =>
                        `- ${citation.id}${citation.title ? `: ${citation.title}` : ""}`,
                      )
                      .join("\n")}
                  </text>
                )}
                {viewModel.knowledgeImpact.constraints.length > 0 && (
                  <text>
                    {viewModel.knowledgeImpact.constraints
                      .map((constraint) => `- ${constraint.statement}`)
                      .join("\n")}
                  </text>
                )}
                {viewModel.knowledgeImpact.regressionRisks.length > 0 && (
                  <text>
                    {viewModel.knowledgeImpact.regressionRisks
                      .map((risk) => `- ${risk.statement}`)
                      .join("\n")}
                  </text>
                )}
              </box>
            )}

            {(viewModel.interpretationNote.validationCount > 0 || viewModel.interpretationNote.missingEvidence.length > 0) && (
              <box flexDirection="column">
                <text fg={api.theme.current.warning}><strong>Interpretation note:</strong></text>
                {viewModel.interpretationNote.validationCount > 0 && (
                  <text>Validation checks reported unresolved items: {viewModel.interpretationNote.validationCount} issue(s).</text>
                )}
                {viewModel.interpretationNote.missingEvidence.length > 0 && (
                  <text>
                    {viewModel.interpretationNote.missingEvidence
                      .map((item) => `- ${item.statement}`)
                      .join("\n")}
                  </text>
                )}
              </box>
            )}
          </scrollbox>
        );
      },
    },
  ]);

  if (api.command?.register) {
    api.command.register(() => [
      {
        title: "Kibi: Open Latest Brief",
        value: "kibi.open_latest_brief",
        description: "Opens the latest persisted brief for the current workspace and branch",
        // implements REQ-opencode-kibi-briefing-v6
        onSelect: () => {
          api.route.navigate("kibi.brief");
        },
      },
      {
        title: "Kibi: Open Latest Brief",
        value: "kibi-brief",
        description: "Opens the latest persisted brief for the current workspace and branch",
        // implements REQ-opencode-kibi-briefing-v6
        onSelect: () => {
          api.route.navigate("kibi.brief");
        },
      },
      {
        title: "Kibi: Refresh Brief",
        value: "kibi.refresh_brief",
        description: "Re-reads the latest persisted brief and refreshes the view",
        onSelect: () => {
          api.route.navigate("kibi.brief");
        },
      },
    ]);
  }
};

export { tui };

export default {
  id: "kibi-opencode",
  tui,
} as const;
