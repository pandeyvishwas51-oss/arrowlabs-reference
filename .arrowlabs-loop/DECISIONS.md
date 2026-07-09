# DECISIONS.md — Architecture Decision Records

## ADR-001: Build v2 as a clean parallel engine, not a big-bang rewrite
Options: (a) rewrite the app in place; (b) build a clean engine alongside and cut over
behind a flag. Chose (b). Reasoning: the app is live (arrowlabs.art) with a demo running;
a big-bang rewrite risks weeks of broken product. Parallel + flag (`ENGINE_V2`) is
reversible and keeps the demo safe. Cost: temporary duplication until cutover. Reliability:
high (old path untouched).

## ADR-002: Ports and adapters (hexagonal) for the engine
Options: god-context with all services; DI via module factories. Chose factories + small
service ports (`AiText`, `AiVision`, `BrandStore`, `KeywordProvider`). Reasoning: testable
(smoke injects fakes), swappable (Helium/PI drop in later), and `src/core` stays
framework-free. Cost: a bit more wiring in the composition root. Worth it.

## ADR-003: Registry-driven modules
Every scraper/generator/validator/publisher/platform registers by string key; the pipeline
only talks to registries. Reasoning: adding a feature is a new module + one registration,
never a pipeline edit. This is the core "won't blast when extended" guarantee.

## ADR-004: Marketplace specs are data, sourced from 2026 seller guidelines
Each marketplace (Amazon, Flipkart, Myntra, Noon, Namshi) has its own PlatformSpec and its
own IDQ rule set, with weights reflecting what that marketplace grades. Values cited in
RESEARCH.md. Namshi's fine specs are flagged UNVERIFIED (portal blocked automated access) —
we do not fabricate; a backlog item tracks verification. No-fluff rule.

## ADR-005: Free-first keyword intelligence, paid only when justified
Chose free composite (Google Suggest + Amazon autocomplete + BSR-to-sales) over paying for
Helium 10 up front. Reasoning: exact volume is not scrapeable, but the brand's own Amazon
Brand Analytics (free via Brand Registry) is the real source; Helium/PI are optional paid
add-ons only for out-of-catalog market research. See INTELLIGENCE_SOURCES.md.

## ADR-006: Phase 0 authored from direct codebase knowledge, subagents for execution
The orchestrator authored the initial state files from ground truth accumulated building
the v2 engine (faster and equally rigorous than re-discovering). Subagents are used for
parallel execution of independent backlog items and adversarial review going forward.

## ADR-007: Work on a branch, commit per increment
On `main` at session start; created branch `godmode/v2-engine`. Reasoning: the mandate asks
for per-cycle commits; a branch keeps main safe and the whole campaign reversible.
