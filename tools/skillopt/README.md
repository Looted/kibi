# Kibi SkillOpt evaluation environment

This directory pins Microsoft SkillOpt v0.2.0 for the evaluator. Real runs use the existing authenticated Codex CLI login in `~/.codex/auth.json`. You do not need root owned SkillOpt services, provider API keys, or `/etc/kibi-skillopt`.

For the operator workflow guide, see [docs/skillopt.md](../../docs/skillopt.md).

## Verify

```bash
uv sync --project tools/skillopt --frozen
codex login status
uv run --project tools/skillopt python tools/skillopt/verify_pin.py
uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests
```

The evaluator must use curated synthetic fixtures only. Do not place provider credentials, raw host output, rejected candidates, private manifests, or generated environments under this directory.
