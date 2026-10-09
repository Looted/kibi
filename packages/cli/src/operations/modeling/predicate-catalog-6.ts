import type { PredicateSchemaCandidate } from "./predicate-types.js";

/**
 * UI design patterns: which visual pattern a concept uses, which variants
 * must share it, which code markers make it recognisable, and the layout
 * shell it sits in. `kibi-plugin-ui` enforces these through its check policy;
 * without that plugin they are ordinary predicates.
 */
// implements REQ-mcp-suggest-predicates, REQ-ui-pattern-vocabulary
export const PREDICATE_CATALOG_6: PredicateSchemaCandidate[] = [
  {
    id: "FACT-SCHEMA-UI-PATTERN",
    predicate_name: "ui_pattern",
    title: "UI pattern",
    description:
      "A UI concept must be presented with a named visual pattern, such as a line-and-dots timeline or a card list.",
    argument_names: ["subject", "pattern"],
    argument_types: ["ui_entity", "ui_pattern"],
    argument_descriptions: [
      "The UI concept or region, such as an annotation list.",
      "The agreed visual pattern for that concept.",
    ],
    keywords: [
      "pattern",
      "design pattern",
      "presented as",
      "rendered as",
      "displayed as",
      "timeline",
      "card list",
      "layout pattern",
    ],
    aliases: ["visual pattern", "design direction"],
    examples: ["ui_pattern(annotation_list, line_dots_timeline)"],
    tags: ["ui", "design", "pattern"],
  },
  {
    id: "FACT-SCHEMA-SAME-PATTERN",
    predicate_name: "same_pattern",
    title: "Same pattern across variants",
    description:
      "Two variants of a UI concept (roles, viewports, presentations) must use the same visual pattern.",
    argument_names: ["subject", "variant", "other_variant"],
    argument_types: ["ui_entity", "ui_variant", "ui_variant"],
    argument_descriptions: [
      "The UI concept whose variants must not diverge.",
      "One variant, such as a role or presentation.",
      "The variant that must match it.",
    ],
    keywords: [
      "same pattern",
      "same design",
      "consistent",
      "for both",
      "same timeline",
      "must match",
    ],
    aliases: ["consistent across roles", "no divergent variant"],
    examples: ["same_pattern(annotation_list, editor_view, read_only_view)"],
    tags: ["ui", "design", "consistency"],
  },
  {
    id: "FACT-SCHEMA-PATTERN-MARKER",
    predicate_name: "pattern_marker",
    title: "Pattern marker",
    description:
      "A visual pattern is recognisable in code by a stable marker such as a CSS class or test id.",
    argument_names: ["subject", "marker"],
    argument_types: ["ui_pattern", "ui_marker"],
    argument_descriptions: [
      "The visual pattern the marker belongs to.",
      "Literal class name or test id that implementations of the pattern contain.",
    ],
    keywords: [
      "marker",
      "marked by",
      "class name",
      "test id",
      "data-testid",
      "css class",
    ],
    aliases: ["pattern anchor"],
    examples: ["pattern_marker(line_dots_timeline, timeline_dot)"],
    tags: ["ui", "design", "pattern"],
  },
  {
    id: "FACT-SCHEMA-UI-CONTAINER",
    predicate_name: "ui_container",
    title: "UI container",
    description:
      "A UI region must sit in a container of a given size with a given overflow behaviour.",
    argument_names: ["subject", "size", "overflow"],
    argument_types: ["ui_entity", "ui_size", "ui_overflow"],
    argument_descriptions: [
      "The UI region the container holds.",
      "Container size, such as half_page or full_height.",
      "Overflow behaviour, such as scroll or clip.",
    ],
    keywords: [
      "container",
      "half page",
      "half-page",
      "scrollbar",
      "scrollable",
      "panel",
      "overflow",
    ],
    aliases: ["layout shell"],
    examples: ["ui_container(review_panel, half_page, scroll)"],
    tags: ["ui", "design", "layout"],
  },
];
