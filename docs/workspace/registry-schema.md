# Workspace Registry Metadata Schema

This document defines the metadata contract the workspace registry must follow. The registry powers inventory tracking, tooling outputs, and contribution guidance for the three workspace tiers (full panel, preview, conversation attachment).

## File location
- Registry source: `docs/workspace/registry.json`
- JSON Schema (machine validation): `docs/workspace/registry.schema.json`

## Top-level shape
```ts
interface WorkspaceRegistry {
  version: string;                 // Semver for breaking changes to the schema itself
  generatedAt?: string;            // Optional ISO timestamp for automated updates
  modules: WorkspaceModule[];      // One entry per workspace capability (e.g. portfolio)
}
```

## Module contract
```ts
interface WorkspaceModule {
  id: string;                      // Kebab-case identifier, unique, stays stable over time
  name: string;                    // Human readable display name
  description?: string;            // Short description of the capability
  category?: string;               // Optional grouping for reporting (e.g. "portfolio", "automation")
  owners: string[];                // GitHub handles or team names responsible for upkeep
  tags?: string[];                 // Free-form keywords to aid filtering
  contracts: ModuleContracts;      // Canonical hook + schema references shared across tiers
  tiers: ModuleTiers;              // Implementation status for each view tier
  analyticsKey?: string;           // Optional key used for tracking events / telemetry
  notes?: string;                  // Any misc observations or TODOs
  lastUpdated?: string;            // ISO timestamp of the most recent human-reviewed change
}
```

### Contracts metadata
```ts
interface ModuleContracts {
  dataHook: string;                // Path to the React hook exporting the normalized view-model
  attachmentSchema?: string;       // Path or type name describing conversation attachment payload
  queryKeys?: string[];            // Relevant React Query keys or cache buckets
}
```

### Tier metadata
```ts
type TierId = "full" | "preview" | "attachment";

type TierStatus =
  | "complete"        // feature parity with product spec
  | "in_progress"     // partially built or missing critical UX polish
  | "planned"         // prioritized but no implementation yet
  | "not_applicable"  // intentionally omitted tier (must include notes)
  | "deprecated";      // exists but slated for removal

interface ModuleTiers {
  full: TierMetadata;
  preview: TierMetadata;
  attachment: TierMetadata;
}

interface TierMetadata {
  status: TierStatus;
  component?: string;             // Path to the React component for this tier
  story?: string;                 // Path to story/visual test covering the tier
  docs?: string;                  // Reference doc explaining UX decisions, if any
  notes?: string;                 // Open issues, validation gaps, or rationale
}
```

## Validation rules
- `id` must match `/^[a-z0-9-]+$/` and be unique across the array.
- When `tier.status === "complete"`, both `component` and `story` should be present.
- When `tier.status === "not_applicable"`, `notes` is required to explain why.
- `owners` must contain at least one entry.
- `contracts.dataHook` must be a relative path inside `src/`.

## Versioning
- Bump `WorkspaceRegistry.version` whenever the schema gains, removes, or changes required fields.
- Keep the JSON Schema file in sync; automated checks can validate `registry.json` during CI.

## Usage expectations
- The CLI status tool will parse `registry.json` and emit warnings for missing tiers, stale timestamps, or contract violations.
- Contribution docs will point to this schema and require new workspace modules to register themselves before merge.

## Runtime layout hints
- Panels emitted by the backend may include `metadata.density` to guide the workspace grid.
  - Accepted values: `"full"` (span the entire row) or `"rail"` (stacked columnar card).
  - If omitted, the UI falls back to kind-specific defaults (portfolio, charts, and history summaries occupy full width).
- New widgets should always set this metadata so the grid can render predictable layouts without bespoke code.
