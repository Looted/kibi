---
title: Four launch-platform SWI-Prolog artifacts accepted on native build and clean-consumer runners
status: active
fact_kind: observation
tags:
  - prolog
  - build
  - pipeline
  - native-evidence
id: FACT-prolog-build-pipeline-native-acceptance
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Native acceptance was observed in [SWI-Prolog build run 36757628273](https://github.com/Looted/kibi/actions/runs/36757628273), attempt 1, on source commit `c9d5327bbc78250f08ec1936a0ccd172b4e211b8`. All four build jobs and their four separate consumer jobs completed successfully. Independent downloaded-byte audits accepted every target archive and verified all twelve GitHub artifact ZIP digests and sizes.

Each producer and consumer report recorded 25 passing checks, all 18 required libraries, and four license files. Independent checks matched archive sidecars, executable hashes, committed source/dependency/patch pins, target architecture, and source/run identity. Actual consumer logs place clean-runner preflight before artifact download and show the extracted absolute executable running the pinned-version, LibBF, subsecond-timestamp, and all 18 library goals.

| Target | Archive artifact ID | Tar bytes | Producer / consumer extracted KiB |
| --- | --- | ---: | ---: |
| linux-x64-gnu | 11117682094 | 6607583 | 22160 / 22160 |
| linux-arm64-gnu | 11117751845 | 6908168 | 30156 / 30156 |
| darwin-arm64 | 11118095455 | 6110682 | 20272 / 20272 |
| darwin-x64 | 11117238350 | 6003674 | 20064 / 20064 |

| Target | Tar SHA-256 | Extracted binary SHA-256 |
| --- | --- | --- |
| linux-x64-gnu | `dfe21b1988d56e66e9d8953ff355d45b66f07606866db57c98b7dff9bfef1aed` | `be28ad8753a91e5492906149ed8ac01422e67aea78027a16efb7e78e940312c6` |
| linux-arm64-gnu | `294437d69c4b10813e35a079ffaf7a7d978db8e679c0a12b5b878a70953208e8` | `af28e5465ec6172496155b3cf3990bc81139ed64dc60d4e1aa1a24d1c396bd67` |
| darwin-arm64 | `92ab21989ee3be718875184f365edb8434867861eb7b93359cf2e01168849903` | `4ac25eccbc17ebe96cffffd0d7714b1460dccd6aa11cd99d39ab375173c1b4ba` |
| darwin-x64 | `c109e0b0947f853552712bd33f8b0e22e027294be75b7814ed80d27b17edcbba` | `c0b9350b7ca84a2e8ff4d1832de01bc77dc5b00788a2842e42a925612b015089` |

The Linux byte audits found a maximum required GLIBC version of 2.28. Both Darwin archives had minimum deployment metadata 12.0.0 and 41 signed Mach-O files; actual consumer hosts ran macOS 15. The macOS 12 value is deployment metadata, not an observation from a macOS 12 host.

This observation records the real native acceptance run. The separate requirement proof receipt establishes the deterministic pipeline validation controls; its local synthetic fixtures do not certify these native artifacts.