# Source Priority and Conflict Policy

## Priority Order

1. Official OpenNext Cloudflare docs for features, setup, and adapter CLI behavior.
2. Official Cloudflare docs for workers limits, bindings semantics, and Wrangler behavior.
3. Official OpenNext Cloudflare examples repository for implementation patterns.
4. Known-issues pages for documented exceptions and warning interpretation.
5. Local command/tool output (`--help`, build logs, deploy logs) for current behavior checks.

## Conflict Resolution Rules

- Prefer newer official docs over older unofficial guidance.
- Prefer documented adapter command model over ad hoc Wrangler workflows, except in explicitly advanced scenarios.
- Prefer current local tool behavior over stale migration notes when behavior diverges.
- Mark unresolved conflicts as assumptions and scope their impact before proceeding.

## Time-Sensitive Validation Rules

- Re-check version support and deprecation claims before changing production configs.
- Re-check Wrangler minimum versions for feature-specific behavior.
- Re-check Cloudflare limit values before giving hard numeric guarantees.

## Ambiguity Handling

- If docs disagree on deduplication or cache behavior details, run a minimal reproduction and keep the safer configuration.
- If reproduction is not possible, choose conservative defaults and document uncertainty.

## Scope Guard Rules

- Reject non-OpenNext or non-Cloudflare deployment advice in this skill.
- Reject Edge-runtime guidance for `@opennextjs/cloudflare` app routes.
- Reject multi-worker recommendations when preview URLs or skew protection are hard requirements.
