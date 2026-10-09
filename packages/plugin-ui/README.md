# kibi-plugin-ui

Experimental Kibi plugin that keeps UI components on their agreed design
patterns. It contributes one capability, `kibi.check-policy.v1`: a JSON policy
that `kb_check` reads as data. Kibi never imports this package's code while
checking.

With the plugin active, `kb_check` blocks two kinds of drift:

- **`policy-ownership`**: a React or Angular component (`*.tsx`, `*.jsx`,
  `*.component.ts`, tests and stories excluded) must implement a current
  requirement grounded in UI design vocabulary: `ui_pattern`, `same_pattern`,
  `ui_container` or `visual_layout_rule`. In React files the rule matches
  PascalCase symbols and skips names ending in `Props`, `State`, `Context`,
  `Variant(s)` or `Type(s)`. Tag a component
  `review:ui-unconstrained` when it genuinely has no design constraint.
- **`policy-markers`**: a component implementing a requirement that names a
  `ui_pattern` must still contain every `pattern_marker` the KB declares for
  that pattern, in its source file or its `.html` template. Rewriting a
  line-and-dots timeline as cards drops the timeline markers and fails the
  check.

Requirements grounded only in `ui_pattern`, `same_pattern` and
`pattern_marker` are proved by component-scope tests (`verification_scope:
unit` or `integration`) with fresh proof receipts, so pattern requirements do
not need end-to-end tests. Those three predicates and the scope rule are part
of Kibi core; this plugin only turns enforcement on.

Colours, spacing and which component library renders a scrollbar are lint
concerns and stay out of this plugin.

## Install and activate

`/kibi-bootstrap` offers this plugin when it finds UI sources. To enable it by
hand:

```bash
npm install --save-dev kibi-plugin-ui
```

```json
{
  "kibi": {
    "plugins": [
      {
        "package": "kibi-plugin-ui",
        "capabilities": {
          "kibi.check-policy.v1": { "mode": "augment" }
        }
      }
    ]
  }
}
```

Check policies only support `augment`. To decline the bootstrap offer
permanently, list the package under `kibi.declinedPlugins`:

```json
{ "kibi": { "declinedPlugins": ["kibi-plugin-ui"] } }
```

## Modeling a pattern

```text
REQ-feed-timeline-pattern  requires_predicate
  FACT-feed-timeline       ui_pattern(activity_feed, line_dots_timeline)
  FACT-feed-variants       same_pattern(activity_feed, editor_view, read_only_view)
FACT-timeline-dot          pattern_marker(line_dots_timeline, timeline_dot)
FACT-timeline-connector    pattern_marker(line_dots_timeline, timeline-connector)
```

Markers are literal class names or test ids. Both `timeline_dot` and
`timeline-dot` spellings match. Write one component test per variant so a
divergent branch inside a single template is caught by proof rather than by
the static marker check, which cannot see branches.

See the [plugin guide](https://looted.github.io/kibi/reference/plugins.html)
for how check policies work and the
[UI requirements guide](https://github.com/Looted/kibi/blob/master/docs/ui-requirements.md)
for the full modeling workflow.
