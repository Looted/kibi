# Kibi SkillOpt evaluation environment

This directory is an isolated research tool, not a Kibi runtime dependency. It pins Microsoft SkillOpt v0.2.0 to commit `b860a5cf88ce75e2bd02ca981ac21fb28cffba83`.

For the operator workflow guide, see [docs/skillopt.md](../../docs/skillopt.md).

## Verify

```bash
uv sync --project tools/skillopt --frozen
uv run --project tools/skillopt python tools/skillopt/verify_pin.py
uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests
```

The evaluator must use curated synthetic fixtures only. Do not place provider credentials, raw host output, rejected candidates, private manifests, or generated environments under this directory.
