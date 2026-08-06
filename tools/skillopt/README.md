# Kibi SkillOpt evaluation environment

This directory pins Microsoft SkillOpt v0.2.0 for the evaluator. Real Codex-authenticated runs use the existing login in `~/.codex/auth.json` and do not need provider API keys in this tree.

F1 free/local review stays independent of the external verifier. F3 independent production verification and adoption evidence require a separately operator-provisioned external trust bundle under `/etc/kibi-skillopt` and the installer handoff:

```bash
sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1
```

Repository code does not install, sign, or substitute that trust plane. For the full operator workflow, see [docs/skillopt.md](../../docs/skillopt.md).

## Verify

```bash
uv sync --project tools/skillopt --frozen
codex login status
uv run --project tools/skillopt python tools/skillopt/verify_pin.py
uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests
```

The evaluator must use curated synthetic fixtures only. Do not place provider credentials, raw host output, rejected candidates, private manifests, or generated environments under this directory.
