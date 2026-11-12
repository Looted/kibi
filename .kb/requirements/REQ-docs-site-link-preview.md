---
title: Documentation site pages render as large link previews when shared
status: open
semantic_text: Every published documentation site page declares a canonical URL and Open Graph link-preview tags that include a preview image. Every published documentation site page declares a large-image Twitter card. The link-preview image is a 1200x630 PNG published at the documentation site root. Every link-preview URL is absolute and derived from the published site origin.
logic_claims:
  - CLAIM-BD71E4DCF8A57BB6
  - CLAIM-10D526C3DE9DA6E9
  - CLAIM-D97F869927A03E2A
  - CLAIM-7BDE62D7C16E82D3
semantic_clauses:
  - Every published documentation site page declares a canonical URL and Open Graph link-preview tags that include a preview image
  - Every published documentation site page declares a large-image Twitter card
  - The link-preview image is a 1200x630 PNG published at the documentation site root
  - Every link-preview URL is absolute and derived from the published site origin
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7f5f4fcbc12dd058f2191f5d5b75ac0a7e28badd5dc64e3837c9d105c1e40953
semantic_inventory:
  - claim_key: CLAIM-BD71E4DCF8A57BB6
    claim_text: Every published documentation site page declares a canonical URL and Open Graph link-preview tags that include a preview image
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 126
    reason: Grounded by the strict property fact for the documentation-site link preview.
  - claim_key: CLAIM-10D526C3DE9DA6E9
    claim_text: Every published documentation site page declares a large-image Twitter card
    role: descriptive
    status: modeled
    span:
      start: 128
      end: 203
    reason: Grounded by the strict property fact for the documentation-site link preview.
  - claim_key: CLAIM-D97F869927A03E2A
    claim_text: The link-preview image is a 1200x630 PNG published at the documentation site root
    role: descriptive
    status: modeled
    span:
      start: 205
      end: 286
    reason: Grounded by the strict property fact for the documentation-site link preview.
  - claim_key: CLAIM-7BDE62D7C16E82D3
    claim_text: Every link-preview URL is absolute and derived from the published site origin
    role: descriptive
    status: modeled
    span:
      start: 288
      end: 365
    reason: Grounded by the strict property fact for the documentation-site link preview.
tags:
  - docs
  - site
  - link-preview
priority: could
required_evidence: tested
rationale: Shared links to the site render as a large preview that shows what Kibi is, and a move to a custom domain stays a one-constant change.
origin:
  kind: agent
  recorded_at: '2026-11-12T18:27:09.099Z'
id: REQ-docs-site-link-preview
type: req
---
Every published documentation site page declares a canonical URL and Open Graph link-preview tags that include a preview image. Every published documentation site page declares a large-image Twitter card. The link-preview image is a 1200x630 PNG published at the documentation site root. Every link-preview URL is absolute and derived from the published site origin.

## Context

Links to the site shared on social networks and in chat rendered as bare text cards: the pages had an Open Graph title and description but no image, URL or Twitter card. A large preview image and full card metadata make a shared link show what Kibi is. Preview crawlers do not resolve relative URLs, so every preview URL is absolute; deriving them from the one published site origin keeps a future move to a custom domain a single change.

## Source

> Does the Kibi homepage have metadata for nice link-sharing thumbnails (Open Graph)?
