---
name: opennext-cloudflare
description: Configure, migrate, deploy, optimize, and troubleshoot Next.js applications on Cloudflare Workers using @opennextjs/cloudflare. Use when work involves OpenNext Cloudflare setup, wrangler.jsonc or open-next.config.ts changes, bindings, caching and revalidation, image optimization, environment variable strategy, performance tuning, or advanced multi-worker deployments.
---

# OpenNext Cloudflare

Use this skill to configure and operate Next.js on Cloudflare Workers with the OpenNext Cloudflare adapter.

## Scope Guard

- Apply this skill only for Next.js workloads deployed through `@opennextjs/cloudflare`.
- Route generic Cloudflare platform tasks to `$cloudflare-deploy` when OpenNext-specific behavior is not required.
- Avoid recommending `export const runtime = "edge"` with this adapter.
- Treat multi-worker mode as incompatible with preview URLs and skew protection.
- Verify time-sensitive claims against current official docs before finalizing version guidance.

## Source Priority and Conflict Policy

Use [source-priority.md](references/source-priority.md) before applying advice. Prefer official OpenNext Cloudflare and Cloudflare docs, then adapter examples, then inferred heuristics.

## Profile-Driven Workflow

1. Select a profile in [profiles.md](references/profiles.md).
2. Apply baseline setup and deploy steps from [setup-and-deploy.md](references/setup-and-deploy.md).
3. Apply cache and performance choices from [caching-and-performance.md](references/caching-and-performance.md).
4. Apply runtime and integration rules from [integrations-and-runtime.md](references/integrations-and-runtime.md).
5. Run validation and troubleshooting steps in [diagnostics-playbook.md](references/diagnostics-playbook.md).

## Execution Checklist

1. Inspect `package.json`, `next.config.(js|ts)`, `wrangler.jsonc`, and `open-next.config.ts`.
2. Confirm runtime baselines for Next.js, `@opennextjs/cloudflare`, and Wrangler.
3. Use `opennextjs-cloudflare` commands for build/deploy flow unless a task explicitly requires raw Wrangler commands.
4. Ensure `nodejs_compat`, compatible `compatibility_date`, and required bindings are configured.
5. Ensure local development is `next dev` plus `initOpenNextCloudflareForDev()`.
6. Run profile-specific verification commands and capture key output.
7. Report applied changes, validation evidence, and any assumptions.

## Optimization Checklist (Ordered by Impact/Risk)

### P0: High impact, low risk

- Keep adapter and Wrangler versions current and compatible.
- Configure static asset caching in `public/_headers` for `/_next/static/*`.
- Use static-assets incremental cache for pure SSG; use R2 incremental cache when revalidation is required.
- Add queue and tag cache only when time-based or on-demand revalidation needs them.
- Use per-request Drizzle/Prisma clients instead of global DB clients.
- Use `next dev` for iteration and `opennextjs-cloudflare preview` for Workers-runtime parity.

### P1: Medium impact, medium risk

- Enable regional cache for R2 incremental cache (`withRegionalCache`) in revalidation-heavy workloads.
- Enable automatic cache purge when on-demand revalidation is used with Cache API-backed components.
- Move from D1 tag cache to sharded DO tag cache as load and invalidation volume increase.
- Use `run_worker_first` selectively when assets must pass through middleware/rewrites.

### P2: High impact, high risk or high complexity

- Adopt multi-worker split deployments only when memory or cold-start pressure justifies added operational complexity.
- Enable skew protection only when deployment topology and feature constraints are satisfied.
- Enable remote bindings only with explicit version support and environment safeguards.

## Diagnostics Workflow

1. Classify the failure stage: setup, build, preview, deploy, runtime, or performance.
2. Check baseline config invariants in [setup-and-deploy.md](references/setup-and-deploy.md).
3. Check runtime and library pitfalls in [integrations-and-runtime.md](references/integrations-and-runtime.md).
4. Check cache topology and invalidation behavior in [caching-and-performance.md](references/caching-and-performance.md).
5. Follow symptom-based runbooks in [diagnostics-playbook.md](references/diagnostics-playbook.md).
6. For performance issues, reproduce with unminified build and collect CPU profile before architecture changes.
7. Escalate to advanced modes only after baseline issues are ruled out.

## Reference Map

- Profiles and decision matrix: [profiles.md](references/profiles.md)
- Setup, migration, and deployment flow: [setup-and-deploy.md](references/setup-and-deploy.md)
- Caching architecture and performance tuning: [caching-and-performance.md](references/caching-and-performance.md)
- Bindings, env vars, ORM, image, and runtime specifics: [integrations-and-runtime.md](references/integrations-and-runtime.md)
- Troubleshooting and diagnostics runbook: [diagnostics-playbook.md](references/diagnostics-playbook.md)
- Source precedence and conflict handling: [source-priority.md](references/source-priority.md)
