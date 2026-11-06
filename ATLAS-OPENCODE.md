# Atlas site ranking repair for OpenCode

Work inside the existing Atlas repository. Implement the embedded changes, run the tests and report what passed. This document contains the complete source diff against David's uploaded Atlas revision. The billboard and warehouse briefs exercise the same general site-selection pipeline.

## Apply the code

1. Check the current branch and working tree. Preserve local edits. Place this file in the repository root as `ATLAS-OPENCODE.md`.
2. From that directory, run the command below with Node 24. It extracts the embedded patch to a temporary directory, checks whether it applies and applies it only after the check succeeds. It recognises an already-applied patch. It does not commit, push or deploy.
3. If both checks fail, use the printed temporary patch path. Compare the affected files with the current implementations. Port the relevant hunks by hand, preserving newer changes and using the tests below to verify behaviour.

```sh
node -e "const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'); const md=fs.readFileSync('ATLAS-OPENCODE.md','utf8'); const block=md.split('<!-- ATLAS_PATCH_BEGIN -->'+String.fromCharCode(10))[1].split(String.fromCharCode(10)+'<!-- ATLAS_PATCH_END -->')[0]; const patch=block.split(String.fromCharCode(10)).slice(1,-1).join(String.fromCharCode(10))+String.fromCharCode(10); const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'atlas-')),'ranking.patch'); fs.writeFileSync(file,patch); console.log(file); const run=(args)=>cp.spawnSync('git',['apply',...args,file],{stdio:'inherit'}).status; if(run(['--check'])===0) process.exit(run([])); if(run(['--reverse','--check'])===0) console.log('Already applied'); else process.exit(1);"
```

## Follow one request through the files

| Stage | Files relative to repo root | What to verify |
|---|---|---|
| Interpret the brief | `app/page.tsx`, `app/api/research/route.ts`, `lib/intent/validate.ts`, `lib/research-run/brief.ts`, `lib/location/geocoder.ts` | Capture the purpose, specific locality and radius. Surface an unresolved locality to the user. |
| Discover and locate candidates | `lib/research-run/adapters.ts`, `face-inventory.ts` in the same directory, and `lib/research-run/listings/{acquisition,detail-pin,parser,match}.ts` | Find identifiable assets, extract property coordinates from detail pages, and check the radius. Category pages belong among the leads. |
| Attach evidence | `lib/connectors/{stats_sa,tomtom_traffic,i_traffic,types}.ts` and `lib/research-run/{run,contracts,evidence,evidence-grades}.ts` | Preserve each source's geographic scope. A suburb profile describes residents. A dated face survey describes a particular advertising face. |
| Rank and explain | `lib/research-run/{site-fit,candidates,model-synthesis}.ts`, `components/ResearchResultView.tsx` | Compare individual candidates, show contributing factors, enforce shortlist length and preserve the deterministic order when AI commentary fails. |
| Verify | `package.json`, `scripts/site-ranking-check.ts`, `scripts/research-v1-check.ts` | The fixtures exercise geography, ranking, source identity, survey freshness, and the complete listing-to-shortlist path. |

## Run the checks

Use the repository's existing development environment. Run `corepack pnpm install --frozen-lockfile`, then `corepack pnpm typecheck`, `corepack pnpm test:site-ranking`, `corepack pnpm test:research-v1`, `corepack pnpm test:listings-v1`, `corepack pnpm test:reliability`, and `corepack pnpm build`. If the runtime blocks the test runner's IPC socket, run the corresponding script with `node --import tsx scripts/site-ranking-check.ts`, substituting the appropriate check filename.

In an authorised preview environment, set `RESEARCH_V1_ENABLED=true`, verify `/api/research/capability` returns `enabled: true`, and submit fresh text briefs through the homepage. Inspect the actual request to `POST /api/research` and record each source's outcome, candidate identity, score factors and source dates. Report fixture results separately from live observations. Leave production deployment to David.

## Where each source belongs

| Source | How the research pipeline uses it | What to check |
|---|---|---|
| Registry and Nominatim | Resolve the named locality before spatial discovery | Check the returned centre and radius. A failed specific match asks for a clearer locality. |
| OpenStreetMap / Overpass | Search the brief radius for billboards, brownfields, warehouses and freight facilities as applicable, plus roads, schools, healthcare, transit and retail | Source links identify individual map objects. A brownfield is an investigation lead. Owner willingness, parcel boundaries, vacancy and rights require verification. Map coverage and category limits affect recall. |
| Google Places and TomTom Places | Search POIs using `GOOGLE_PLACES_API_KEY` and `TOMTOM_API_KEY` | A school or hospital can contribute through its distance to each candidate when relevant to the brief. A straight-line distance measures proximity only. |
| Curated SA traffic counts | Evaluate the nearest counted corridor separately for each site with its original count year, source, distance to midpoint and heavy-vehicle share | Check the count year. Its limited score represents corridor context. It cannot estimate people seeing one billboard. |
| TomTom Traffic and i-Traffic | For road-related briefs, fetch incident and camera/alert context using `TOMTOM_API_KEY` and `I_TRAFFIC_API_KEY` | Events are area context. Their count contributes zero to measured audience exposure. |
| Stats SA-derived local tables | Look up the residential profile at each candidate pin, retaining suburb/city scope | A professional-target brief can use suburb professional share as a low-weight proxy. This is a local data lookup. A current retrieval date does not update the source data. |
| Local zoning layer | Identify predominant area zoning as an indicative screening factor | An erf certificate, actual municipal land-use geometry or municipal confirmation is still needed for rights. |
| Tavily and property portals | `TAVILY_API_KEY` discovers listings. Detail-authorised sources go first. Accepted pages retain structured property coordinates when available | Inspect detail fetch failures. An unpinned, blocked or excluded listing cannot fill a ranked position. Search pages and unresolved details remain leads. |
| MiniMax and Perplexity | `MINIMAX_API_KEY` and `PERPLEXITY_API_KEY` enable their respective search/synthesis paths | A narrative can explain the shortlist. A model that drops or reorders the ranked candidates triggers deterministic reporting. |
| Operator billboard inventory | Optional server-side `ATLAS_BILLBOARD_INVENTORY_JSON` accepts an array of real, source-linked faces | Each row requires a unique string `id`, `name`, SA `lat` and `lng`, a `direction`, and a `sourceUrl`. Its optional `survey` has an ISO `date`, numeric `vehiclesPerDay`, and optional `target` plus `targetShare` between zero and one. Use the URL of the supporting survey/inventory. Future or older-than-365-day counts receive no measured-volume credit. Keep secrets server-side. |

## Acceptance briefs

**Warehouse.** “Identify 3–5 vacant or redevelopment sites within 10 km of Johannesburg South for a logistics-warehouse development; prioritize industrial zoning, truck access, freight demand, competing logistics supply, and servicing or entitlement constraints.”

Check the resolved locality, candidate identity and distance before reviewing the score. A mapped brownfield or a pinned qualifying listing can be investigated. A warehouse business, suburb or cluster of shops cannot become a warehouse plot. Freight-terminal proximity and historical heavy-vehicle counts are proxies. Verify actual truck routing, site servicing, rights, occupancy and demand separately. If discovery only establishes two sites, expect at most two.

**Billboard.** “Rank the top 3 billboard sites within 10 km of Sandton for a campaign targeting parents near schools. Prioritize traffic and explain the evidence for each site.”

Open the face or site record. Review the local traffic and school evidence alongside the open checks. Two opposing faces at the same point may have different measured traffic. A school nearby supports a local catchment hypothesis; it does not establish who actually drove past. For the same inventory with different rotation dates, rerun using a fresh survey. Never populate an operator survey from a corridor average.

## What the scores mean

The score is a screening heuristic, with weights in `lib/research-run/site-fit.ts` and hard listing checks in `lib/research-run/listings/match.ts`. It is not a probability or a calibrated estimate of return, reach, or development success. Rights, local traffic and audience feeds absent from the original project cannot be reconstructed from API keys. Sparse input can legitimately yield an empty shortlist or a tie. For production acceptance, compare the first few preview runs to records independently checked by a broker, planner or media operator before tuning weights.

## Complete code patch

<!-- ATLAS_PATCH_BEGIN -->
````diff
diff --git a/app/api/research/route.ts b/app/api/research/route.ts
index 553d99c..b2c7fcc 100644
--- a/app/api/research/route.ts
+++ b/app/api/research/route.ts
@@ -143,7 +143,7 @@ export async function POST(req: NextRequest) {
     let row;
     try {
       row = await persistResearchIfOwned(execution, completionToken, async () => {
-        const created = await prisma.question.create({ data: { userId: userId ?? "", vertical: parsedInput.vertical, questionText: parsedInput.prompt, responseJson: toPrismaJson(sanitizeForJson(result)) } });
+        const created = await prisma.question.create({ data: { userId: userId ?? "", vertical: result.request.vertical, questionText: parsedInput.prompt, responseJson: toPrismaJson(sanitizeForJson(result)) } });
         // Capture the id before the ownership wrapper checks the signal again;
         // a disconnect during the DB round trip can still clean up its own row.
         createdRowId = created.id;
@@ -188,6 +188,10 @@ export async function POST(req: NextRequest) {
       return failureJson(failure, failure.statusCode, error.code);
     }
     const message = error instanceof Error ? error.message : "research_failed";
+    if (message === "unsupported_search_radius") return validationJson("needs_clarification", message, body, { reason: "Choose a search radius greater than zero and up to 50 km." });
+    if (message === "location_needs_clarification") {
+      return validationJson("needs_clarification", "needs_clarification", body, { reason: "Atlas could not resolve the requested locality. Enter a specific suburb or town as the search centre." });
+    }
     const isInvalidBrief = message === "invalid_brief" || /Add what|Atlas evaluates|supported development/.test(message);
     if (isInvalidBrief) {
       const code = message === "invalid_brief" ? "invalid_brief" : "invalid_request";
diff --git a/app/page.tsx b/app/page.tsx
index 82de80b..408a549 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -540,7 +540,7 @@ export default function HomePage() {
        // the legacy, image-aware endpoint.
        const researchRequest = researchV1Enabled && attachments.length === 0;
       const requestBody = (useResearch: boolean) => ({
-        vertical: v,
+        vertical: useResearch && /\bbillboards?\b/i.test(q) ? "custom:billboard" : v,
         question: q,
         ...(demoMode
           ? { model: "curated-stub", demo: true }
@@ -1154,7 +1154,7 @@ export default function HomePage() {
                           : "Atlas is focused on development and site selection."}
                         </h2>
                         <p className="mt-2 text-sm leading-6 text-amber-100/80">
-                      {validationFeedback.error || validationFeedback.details?.reason}
+                      {validationFeedback.details?.reason || validationFeedback.error}
                         </p>
                         <div className="mt-3 grid gap-2 text-xs text-amber-100/85 sm:grid-cols-2">
                           {[
diff --git a/components/ResearchResultView.tsx b/components/ResearchResultView.tsx
index aa85775..20ef526 100644
--- a/components/ResearchResultView.tsx
+++ b/components/ResearchResultView.tsx
@@ -67,19 +67,19 @@ function CandidateCard({ candidate, rationale, resultId, runId, userId }: { cand
       <div className="text-right text-xs text-atlas-muted"><p>{candidate.source ?? "source"}</p>{candidate.priceText ? <p className="text-atlas-text">{candidate.priceText}</p> : <p>Price unknown</p>}</div>
     </div>
     <div className="mt-3 grid gap-2 sm:grid-cols-3">
-      <Metric label="Site suitability" value={candidate.suitability} hint="How well the verified, property-scoped evidence fits this brief." />
-      <Metric label="Evidence reliability" value={candidate.evidenceReliability} hint="How trustworthy and geographically precise the supporting evidence is." />
+      <Metric label="Site suitability" value={candidate.suitability} hint="Screening points from direct evidence and explicitly labelled nearby proxies. Missing factors earn zero." />
+      <Metric label="Evidence reliability" value={candidate.evidenceReliability} hint="Share of cited records verified, with uncited screening factors counted as indicative." />
       <Metric label="Due diligence complete" value={candidate.assessmentCompleteness} hint="How much of the required checklist has actually been established." />
     </div>
     {rationale ? <p className="mt-3 text-sm text-atlas-text">{rationale}</p> : null}
     {candidate.zoning ? <p className="mt-2 text-xs text-atlas-muted">Zoning: {candidate.zoning}{candidate.zoningScope === "parcel" ? "" : " (area-level context — parcel rights unconfirmed)"}</p> : null}
     {candidate.reasons.length ? <ul className="mt-2 space-y-1 text-xs text-atlas-muted">{candidate.reasons.map((reason) => <li key={reason}>· {reason}</li>)}</ul> : null}
     {candidate.feasibility.length ? <details className="mt-3 rounded-xl border border-atlas-border p-3"><summary className="cursor-pointer text-xs font-semibold text-atlas-text">Development feasibility</summary><ul className="mt-2 space-y-1 text-xs text-atlas-muted">{candidate.feasibility.map((line) => <li key={line.criterion}><span className={line.basis === "verified" ? "text-emerald-300" : line.basis === "indicative" ? "text-amber-300" : "text-atlas-muted"}>{line.basis}</span> · {line.criterion}: {line.value}{line.note ? ` — ${line.note}` : ""}</li>)}</ul></details> : null}
-    {candidate.factors.length ? <details className="mt-2 rounded-xl border border-atlas-border p-3"><summary className="cursor-pointer text-xs font-semibold text-atlas-text">Evidence used ({candidate.verifiedEvidenceIds.length} verified · {candidate.indicativeEvidenceIds.length} indicative)</summary><ul className="mt-2 space-y-1 text-xs text-atlas-muted">{candidate.factors.map((factor) => <li key={factor.label}><span className="text-atlas-text">{factor.label}</span> — {factor.detail}</li>)}</ul></details> : null}
+    {candidate.factors.length ? <details className="mt-2 rounded-xl border border-atlas-border p-3"><summary className="cursor-pointer text-xs font-semibold text-atlas-text">Evidence used ({candidate.verifiedEvidenceIds.length} verified · {candidate.indicativeEvidenceIds.length} indicative)</summary><ul className="mt-2 space-y-1 text-xs text-atlas-muted">{candidate.factors.map((factor) => <li key={factor.label + factor.detail}><span className="text-atlas-text">{factor.label}</span> · {Math.round(factor.contribution * 100)} screening points · {factor.detail}</li>)}</ul></details> : null}
     {candidate.nextActions.length ? <div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-atlas-muted">Next actions</p><ul className="mt-1 list-disc pl-5 text-xs text-atlas-muted">{candidate.nextActions.map((action) => <li key={action}>{action}</li>)}</ul></div> : null}
     <div className="mt-3 flex flex-wrap items-center gap-3">
       {candidate.lat !== undefined && candidate.lng !== undefined ? <a className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700" href={`https://www.google.com/maps/search/?api=1&query=${candidate.lat},${candidate.lng}`} target="_blank" rel="noreferrer">Google Maps</a> : null}
-      {candidate.sourceUrl && isSafeHttpUrl(candidate.sourceUrl) ? <ListingEventLink className="text-atlas-accent underline" href={candidate.sourceUrl} target="_blank" rel="noreferrer" eventName="listing_detail_clicked" fields={{ runId, resultId, listingId: candidate.id, candidateId: candidate.id, source: candidate.source ?? "listing", urlQuality: "exact_listing" }}>Open source listing</ListingEventLink> : null}
+      {candidate.sourceUrl && isSafeHttpUrl(candidate.sourceUrl) ? <ListingEventLink className="text-atlas-accent underline" href={candidate.sourceUrl} target="_blank" rel="noreferrer" eventName="listing_detail_clicked" fields={{ runId, resultId, listingId: candidate.id, candidateId: candidate.id, source: candidate.source ?? "listing", urlQuality: "exact_listing" }}>Open source record</ListingEventLink> : null}
       <ListingOutcomeControls conditional={candidate.decision === "investigate"} fields={{ runId, resultId, listingId: candidate.id, candidateId: candidate.id }} />
     </div>
   </article>;
@@ -102,7 +102,7 @@ export function ResearchResultView({ result, resultId, runId, userId }: { result
   const rejected = candidates.filter((candidate) => candidate.decision === "reject");
   return <main className="mx-auto max-w-5xl space-y-6 px-6 py-10"><div className="rounded-3xl border border-atlas-border bg-atlas-panel p-7"><p data-testid="research-v1-status" className="text-xs font-semibold uppercase tracking-[0.2em] text-atlas-accent">Research v1 · {result.synthesis.status.replaceAll("_", " ")}</p><h1 className="mt-3 text-3xl font-semibold text-atlas-text">{result.synthesis.executiveAnswer}</h1></div>
     {(candidates.length > 0 || (result.sourceLeads?.length ?? 0) > 0) && <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Map</h2><p className="text-sm text-atlas-muted">Blue: locations and properties Atlas picked. Yellow: discovery leads that still need confirmation. Click a point for the reasoning.</p><ResearchMap candidates={candidates} leads={result.sourceLeads ?? []} areaContext={result.areaContext} resultId={resultId} /></section>}
-    {properties.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Candidate properties ({properties.length})</h2><p className="text-sm text-atlas-muted">Only identifiable properties that passed the location and property gates. Suitability, evidence reliability and due-diligence completeness are reported separately.</p><div className="space-y-3">{properties.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} rationale={rationaleByCandidate.get(candidate.id)} resultId={resultId} runId={runId} userId={userId} />)}</div></section>}
+    {properties.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Ranked sites ({properties.length})</h2><p className="text-sm text-atlas-muted">Sites are ordered by screening score. Open the source and review outstanding checks before advancing a candidate.</p><div className="space-y-3">{properties.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} rationale={rationaleByCandidate.get(candidate.id)} resultId={resultId} runId={runId} userId={userId} />)}</div></section>}
     {locations.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Locations that fit this brief ({locations.length})</h2><p className="text-sm text-atlas-muted">Ranked areas where the live evidence says this type of business belongs. These are locations to investigate, not properties for sale — no parcel is claimed.</p><div className="space-y-3">{locations.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} rationale={rationaleByCandidate.get(candidate.id)} resultId={resultId} runId={runId} userId={userId} />)}</div></section>}
     {rejected.length > 0 && <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Rejected prospects ({rejected.length})</h2><p className="text-sm text-atlas-muted">Shown for transparency: these failed a hard gate and are not recommendations.</p><div className="space-y-3">{rejected.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} resultId={resultId} runId={runId} userId={userId} />)}</div></section>}
     {result.areaContext?.length ? <section className="space-y-3"><h2 className="text-xl font-semibold text-atlas-text">Market context (not sites)</h2><p className="text-sm text-atlas-muted">Where the live observations concentrate. These are area signals, not development opportunities.</p><div className="grid gap-2 sm:grid-cols-2">{result.areaContext.map((context) => <AreaContextCard key={context.id} context={context} />)}</div></section> : null}
diff --git a/lib/connectors/i_traffic.ts b/lib/connectors/i_traffic.ts
index e14b589..8de6caf 100644
--- a/lib/connectors/i_traffic.ts
+++ b/lib/connectors/i_traffic.ts
@@ -116,6 +116,7 @@ export const iTrafficConnector: Connector = {
     const fetchedAt = new Date().toISOString();
     const controller = new AbortController();
     const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
+    const requestSignal = ctx.signal ? AbortSignal.any([controller.signal, ctx.signal]) : controller.signal;
 
     try {
       // We only need a coarse region: use a 50km bbox around the site
@@ -133,8 +134,8 @@ export const iTrafficConnector: Connector = {
       } else {
         const [cams, alts] = await withTimeout(
           Promise.all([
-            fetchResource(apiKey, "GetCameras", controller.signal),
-            fetchResource(apiKey, "GetAlerts", controller.signal),
+            fetchResource(apiKey, "GetCameras", requestSignal),
+            fetchResource(apiKey, "GetAlerts", requestSignal),
           ]),
           FETCH_TIMEOUT_MS,
           "i_traffic",
@@ -209,6 +210,7 @@ export const iTrafficConnector: Connector = {
 
       return signals;
     } catch (e) {
+      if (ctx.reportErrors) throw e;
       console.warn(
         `[i_traffic] fetch failed for ${lat},${lng}: ${
           e instanceof Error ? e.message : String(e)
diff --git a/lib/connectors/stats_sa.ts b/lib/connectors/stats_sa.ts
index ea03ad9..06c1e91 100644
--- a/lib/connectors/stats_sa.ts
+++ b/lib/connectors/stats_sa.ts
@@ -231,7 +231,7 @@ export const statsSAConnector: Connector = {
          relevance: suburb ? "relevant" : "suppressed",
          suppressedReason: suburb ? undefined : "city-level demographic evidence cannot support a property-level claim",
          payload: suburb
-           ? { suburb: suburb.name, city: city.name, cityId: city.id, economicZone: suburb.economicZone, growthRateYoY: suburb.growthRateYoY, note: suburb.note }
+           ? { professionalShare: suburb.professionalShare, suburb: suburb.name, city: city.name, cityId: city.id, economicZone: suburb.economicZone, growthRateYoY: suburb.growthRateYoY, note: suburb.note }
            : { suburb: null, city: city.name, cityId: city.id, scope: "city", economicZone: CITY_DEMOGRAPHIC_PROFILES[city.id].economicZone, growthRateYoY: CITY_DEMOGRAPHIC_PROFILES[city.id].growthRateYoY },
       },
       {
diff --git a/lib/connectors/tomtom_traffic.ts b/lib/connectors/tomtom_traffic.ts
index 1f51fc5..6bc4e4c 100644
--- a/lib/connectors/tomtom_traffic.ts
+++ b/lib/connectors/tomtom_traffic.ts
@@ -174,6 +174,7 @@ export const tomtomIncidentsConnector: Connector = {
     const fetchedAt = new Date().toISOString();
     const controller = new AbortController();
     const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
+    const requestSignal = ctx.signal ? AbortSignal.any([controller.signal, ctx.signal]) : controller.signal;
 
     try {
       const key = cacheKey(lat, lng);
@@ -193,13 +194,12 @@ export const tomtomIncidentsConnector: Connector = {
           `&timeValidityFilter=present`;
 
         const res = await withTimeout(
-          fetch(url, { signal: controller.signal }),
+          fetch(url, { signal: requestSignal }),
           FETCH_TIMEOUT_MS,
           "tomtom_traffic",
         );
         if (!res.ok) {
-          console.warn(`[tomtom_traffic] HTTP ${res.status}`);
-          return [];
+          throw new Error("http_" + res.status);
         }
         const data = (await res.json()) as IncidentResponse;
         incidents = Array.isArray(data.incidents) ? data.incidents : [];
@@ -296,6 +296,7 @@ export const tomtomIncidentsConnector: Connector = {
 
       return signals;
     } catch (e) {
+      if (ctx.reportErrors) throw e;
       console.warn(
         `[tomtom_traffic] fetch failed for ${lat},${lng}: ${
           e instanceof Error ? e.message : String(e)
diff --git a/lib/connectors/types.ts b/lib/connectors/types.ts
index 52c8c00..6d47808 100644
--- a/lib/connectors/types.ts
+++ b/lib/connectors/types.ts
@@ -84,6 +84,8 @@ export interface Signal {
  * user's query region (lat/lng + a free-text label).
  */
 export interface ConnectorContext {
+  /** Research orchestration records transport failures separately from empty measurements. */
+  reportErrors?: boolean;
   vertical: Vertical;
   location: { lat: number; lng: number; label?: string };
   site: { id: string; name: string; lat: number; lng: number; cityId?: string; suburb?: string };
diff --git a/lib/intent/validate.ts b/lib/intent/validate.ts
index 0e45bbe..17fb929 100644
--- a/lib/intent/validate.ts
+++ b/lib/intent/validate.ts
@@ -24,12 +24,12 @@ export type ValidationResult =
   | { ok: false; status: Exclude<ValidationStatus, "valid">; code: Exclude<ValidationCode, "valid">; vertical: string; question: string; details: ValidationDetails };
 
 const DEVELOPMENT_SIGNALS = [
-  /\b(build|develop|redevelop|construct|open|launch|set up|establish|locate|find|identify|rank|compare|assess|evaluate)\b/i,
+  /\b(billboards?|build|develop|redevelop|construct|open|launch|set up|establish|locate|find|identify|rank|compare|assess|evaluate)\b/i,
   /\b(site|location|land|plot|property|erf|development|project|scheme|facility|premises|opportunity)\b/i,
   /\b(where|near|around|within|in)\b/i,
 ];
-const SITE_SELECTION_SIGNALS = /\b(best\s+(site|location|area|place|spot|land)|suitable\s+(site|location|area|place)|site[- ]selection|development\s+opportunit|vacant|redevelopment|zoning|footfall|demand|competition|access|constraints?)\b/i;
-const OBJECTIVE_SIGNALS = /\b(build|develop|redevelop|construct|open|launch|set up|establish|locate|find|identify|rank|compare|assess|evaluate|site|location|land|plot|property|development|project|facility|premises|best\s+(site|location|area|place|spot|land)|suitable\s+(site|location|area|place)|site[- ]selection)\b/i;
+const SITE_SELECTION_SIGNALS = /\b(best\s+(site|location|area|place|spot|land)|suitable\s+(site|location|area|place)|site[- ]selection|billboards?|development\s+opportunit|vacant|redevelopment|zoning|footfall|demand|competition|access|constraints?)\b/i;
+const OBJECTIVE_SIGNALS = /\b(billboards?|build|develop|redevelop|construct|open|launch|set up|establish|locate|find|identify|rank|compare|assess|evaluate|site|location|land|plot|property|development|project|facility|premises|best\s+(site|location|area|place|spot|land)|suitable\s+(site|location|area|place)|site[- ]selection)\b/i;
 // Keep this deliberately syntactic: validation must not depend on a live
 // geocoder. Radius wording is a location signal only when it has an `of`
 // place, so `within 5 km` still asks for clarification rather than passing.
diff --git a/lib/location/geocoder.ts b/lib/location/geocoder.ts
index 72a0884..0c3aba9 100644
--- a/lib/location/geocoder.ts
+++ b/lib/location/geocoder.ts
@@ -39,10 +39,10 @@ async function waitForRateLimit(signal?: AbortSignal): Promise<void> {
   const previous = inFlight;
   let release!: () => void;
   inFlight = new Promise<void>((resolve) => { release = resolve; });
-  if (signal?.aborted) throw new Error("nominatim_aborted");
   await previous;
   const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
   try {
+    if (signal?.aborted) throw new Error("nominatim_aborted");
     if (wait > 0) await new Promise<void>((resolve, reject) => {
       const timer = setTimeout(resolve, wait);
       const onAbort = () => { clearTimeout(timer); reject(new Error("nominatim_aborted")); };
diff --git a/lib/research-run/adapters.ts b/lib/research-run/adapters.ts
index 5f9b54f..11fa62d 100644
--- a/lib/research-run/adapters.ts
+++ b/lib/research-run/adapters.ts
@@ -2,7 +2,11 @@ import { fetchNearbyCompetitors } from "@/lib/connectors/google-places";
 import { fetchTavilyWebAnswer } from "@/lib/connectors/tavily-search";
 import type { ResearchRequest, RawSourceRecord } from "./contracts";
 import type { ProviderCallBudget } from "./budget";
-import { saZoningConnector } from "@/lib/connectors/sa_zoning";
+import { tomtomIncidentsConnector } from "@/lib/connectors/tomtom_traffic";
+import { iTrafficConnector } from "@/lib/connectors/i_traffic";
+import type { Connector } from "@/lib/connectors/types";
+import { faceInventory } from "./face-inventory";
+import { haversineKm } from "@/lib/location/registry";
 import { saTrafficConnector } from "@/lib/connectors/sa_traffic";
 import { statsSAConnector } from "@/lib/connectors/stats_sa";
 import { findMetroFor, findZoning, getMetroZoning } from "@/lib/data/sa-zoning";
@@ -10,6 +14,7 @@ import { fetchMiniMaxWebSearch } from "./web-search";
 
 export type Adapter = { name: string; enabled: (request: ResearchRequest) => boolean; fetch: (request: ResearchRequest, signal: AbortSignal, budget?: ProviderCallBudget) => Promise<RawSourceRecord[]> };
 
+const radiusMetres = (r: ResearchRequest) => Math.min(50_000, Math.round((r.radiusKm ?? 5) * 1_000));
 const point = (request: ResearchRequest) => request.geography.lat !== undefined && request.geography.lng !== undefined;
 
 export const googlePlacesAdapter: Adapter = {
@@ -20,8 +25,8 @@ export const googlePlacesAdapter: Adapter = {
     // signals (schools for a family home, shops for retail).
     const key = r.vertical.replace(/^custom:/, "");
     const fallbackVertical = key === "residential_land" || key === "residential" ? "school" : key === "warehouse" || key === "industrial" ? "warehouse" : "shopping_mall";
-    const result = await fetchNearbyCompetitors({ lat: r.geography.lat!, lng: r.geography.lng!, vertical: r.vertical as never, radiusM: 5000, signal })
-      .then((first) => first.ok ? first : fetchNearbyCompetitors({ lat: r.geography.lat!, lng: r.geography.lng!, vertical: fallbackVertical as never, radiusM: 5000, signal }));
+    const result = await fetchNearbyCompetitors({ lat: r.geography.lat!, lng: r.geography.lng!, vertical: r.vertical as never, radiusM: radiusMetres(r), signal })
+      .then((first) => first.ok ? first : fetchNearbyCompetitors({ lat: r.geography.lat!, lng: r.geography.lng!, vertical: fallbackVertical as never, radiusM: radiusMetres(r), signal }));
     if (!result.ok) throw new Error(result.error ?? "google_places_error");
     return result.places.map((place) => ({ ...place, sourceUrl: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}&query_place_id=${encodeURIComponent(place.placeId)}` }));
   },
@@ -68,7 +73,17 @@ export const overpassAdapter: Adapter = {
   name: "overpass",
   enabled: (r) => point(r),
   async fetch(r, signal) {
-    const query = `[out:json][timeout:12];(nwr["amenity"](around:5000,${r.geography.lat},${r.geography.lng});nwr["shop"](around:5000,${r.geography.lat},${r.geography.lng}););out center tags;`;
+    const area = `(around:${radiusMetres(r)},${r.geography.lat},${r.geography.lng})`;
+    // Bound each category separately. Thousands of shops must not crowd out
+    // the actual assets or the school/healthcare evidence in a dense metro.
+    const selectors = [
+      'nwr["amenity"~"^(hospital|clinic|school|college|university)$"]',
+      'nwr["public_transport"]', 'nwr["shop"]',
+      'way["highway"~"^(primary|secondary|motorway|trunk)$"]',
+    ];
+    if (r.vertical === "custom:billboard") selectors.unshift('nwr["advertising"="billboard"]');
+    if (/warehouse|industrial/.test(r.vertical)) selectors.unshift('nwr["landuse"="brownfield"]', 'nwr["building"="warehouse"]', 'nwr["industrial"~"^(logistics|distribution|freight_terminal)$"]', 'nwr["railway"="freight_terminal"]');
+    const query = "[out:json][timeout:9];" + selectors.map(selector => selector + area + ";out center 80;").join("");
     // Overpass mirrors rate-limit independently; try a second instance and
     // degrade to "no data" rather than failing the whole source.
     for (const endpoint of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
@@ -76,12 +91,12 @@ export const overpassAdapter: Adapter = {
         const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { signal, headers: { "User-Agent": "Atlas research-v1" } });
         if (!response.ok) continue;
         const data = await response.json() as { elements?: Array<Record<string, unknown>> };
-        return (data.elements ?? []).slice(0, 100).map((element) => ({ ...element, sourceUrl: `https://www.openstreetmap.org/${String(element.type ?? "node")}/${String(element.id ?? "")}` }));
+        return Array.from(new Map((data.elements ?? []).map(row => [String(row.type) + row.id, row])).values()).map((element) => ({ ...element, sourceUrl: `https://www.openstreetmap.org/${String(element.type ?? "node")}/${String(element.id ?? "")}` }));
       } catch (error) {
         if (signal?.aborted) throw error;
       }
     }
-    return [];
+    throw new Error("overpass_unavailable");
   },
 };
 
@@ -91,7 +106,7 @@ export const tomtomAdapter: Adapter = {
   async fetch(r, signal) {
     const category: Record<string, string> = { gas_station: "gas stations", restaurant: "restaurants", cafe: "cafes", retail_shop: "shops", warehouse: "industrial", industrial: "industrial", residential_land: "schools", mixed_use: "shopping centres" };
     const queryCategory = category[r.vertical.replace(/^custom:/, "")] ?? r.vertical.replace(/_/g, " ");
-    const url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(queryCategory)}.json?lat=${r.geography.lat}&lon=${r.geography.lng}&radius=5000&limit=50&key=${encodeURIComponent(process.env.TOMTOM_API_KEY!)}`;
+    const url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(queryCategory)}.json?lat=${r.geography.lat}&lon=${r.geography.lng}&radius=${radiusMetres(r)}&limit=50&key=${encodeURIComponent(process.env.TOMTOM_API_KEY!)}`;
     const response = await fetch(url, { signal });
     if (!response.ok) throw new Error(`http_${response.status}`);
     const data = await response.json() as { results?: Array<Record<string, unknown>> };
@@ -110,7 +125,7 @@ export const saZoningAdapter: Adapter = {
     if (!metro) return [];
     const zone = findZoning(metro.metro, lat, lng);
     if (zone) {
-      return [{ name: `${zone.name} · ${zone.permittedUses ?? "see municipal SDF"}`, label: zone.name, lat, lng, zoning: zone.name, category: zone.category, scope: "parcel" }];
+      return [{ name: `${zone.name} · ${zone.permittedUses ?? "see municipal SDF"}`, label: zone.name, lat, lng, zoning: zone.name, category: zone.category, scope: "area" }];
     }
     // Polygon miss: report the nearest zoning area as area-level context
     // rather than pretending no zoning exists.
@@ -177,5 +192,27 @@ export const minimaxWebSearchAdapter: Adapter = {
   },
 };
 
-export const allAdapters = [googlePlacesAdapter, tavilyAdapter, perplexityAdapter, overpassAdapter, tomtomAdapter, saZoningAdapter, saTrafficAdapter, statsSaAdapter];
+function roadEvents(connector: Connector, key: string): Adapter {
+  return {
+    name: connector.id,
+    enabled: r => point(r) && Boolean(process.env[key]) && /traffic|billboard|truck|warehouse|logistics|road/i.test(r.prompt),
+    async fetch(r, signal) {
+      const origin = { lat: r.geography.lat!, lng: r.geography.lng! };
+      const items = await connector.fetch({ reportErrors: true, vertical: "all" as never, location: origin, site: { ...origin, id: "anchor", name: r.geography.label }, signal });
+      if (items.some(item => item.id.includes(":debug") || item.availability === "unavailable")) throw new Error("traffic_source_unavailable");
+      return items.filter(item => !item.id.includes(":debug") && !item.label.startsWith("DEBUG") && item.availability !== "unavailable")
+        .map(item => ({ name: item.label, lat: item.lat, lng: item.lng, eventType: item.type, scope: "area" }));
+    },
+  };
+}
+const operatorFaces: Adapter = {
+  name: "operator_faces",
+  enabled: r => r.vertical === "custom:billboard" && point(r) && Boolean(process.env.ATLAS_BILLBOARD_INVENTORY_JSON),
+  async fetch(r) {
+    const origin = { lat: r.geography.lat!, lng: r.geography.lng! };
+    return faceInventory(process.env.ATLAS_BILLBOARD_INVENTORY_JSON!).filter(face =>
+      haversineKm(origin, { lat: Number(face.lat), lng: Number(face.lng) }) <= (r.radiusKm ?? 5));
+  },
+};
+export const allAdapters = [googlePlacesAdapter, tavilyAdapter, perplexityAdapter, overpassAdapter, tomtomAdapter, saZoningAdapter, saTrafficAdapter, statsSaAdapter, operatorFaces, roadEvents(tomtomIncidentsConnector, "TOMTOM_API_KEY"), roadEvents(iTrafficConnector, "I_TRAFFIC_API_KEY")];
 export function configuredAdapters(request: ResearchRequest): Adapter[] { return allAdapters.filter((adapter) => adapter.enabled(request)); }
diff --git a/lib/research-run/brief.ts b/lib/research-run/brief.ts
index e713373..55b5583 100644
--- a/lib/research-run/brief.ts
+++ b/lib/research-run/brief.ts
@@ -6,8 +6,9 @@ import type { ResearchMode, ResearchRequest } from "./contracts";
 
 export function extractLocation(prompt: string, supplied?: string): string {
   if (supplied?.trim()) return supplied.trim();
+  const radius = prompt.match(/\bwithin\s+\d+(?:\.\d+)?\s*(?:km|kilomet(?:er|re)s?)\s+of\s+([^,.!?;:]+)/i);
   const match = prompt.match(/\b(?:in|near|around|at|along|by)\s+([^,.!?;:]+)|\bwithin\s+\d+(?:\.\d+)?\s*(?:km|kilometers?)\s+of\s+([^,.!?;:]+)/i);
-  return (match?.[1] ?? match?.[2] ?? "South Africa").trim().replace(/\s+(?:for|with|under|below|within|at a budget|and)\b.*$/i, "").trim();
+  return (radius?.[1] ?? match?.[1] ?? match?.[2] ?? "South Africa").trim().replace(/\s+(?:for|with|under|below|within|at a budget|and|targeting|to reach|to get|near schools|near hospitals|prioriti[sz]ing)\b.*$/i, "").trim();
 }
 
 export function extractConstraints(prompt: string): { budget?: string; constraints: string[] } {
@@ -19,20 +20,30 @@ export function extractConstraints(prompt: string): { budget?: string; constrain
 export async function parseResearchBrief(input: { prompt: string; vertical: string; mode?: ResearchMode; location?: string; selectedModel?: string }, signal?: AbortSignal): Promise<ResearchRequest> {
   const prompt = input.prompt.trim();
   if (!prompt || !isAtlasVertical(input.vertical)) throw new Error("invalid_brief");
-  const validation = validatePrompt(input.vertical, prompt);
+  let vertical = /\bbillboards?\b/i.test(prompt) ? "custom:billboard" : input.vertical;
+  let validation = validatePrompt(vertical, prompt);
+  if (!validation.ok && validation.code === "vertical_mismatch" && validation.details.suggestedVertical) {
+    vertical = validation.details.suggestedVertical;
+    validation = validatePrompt(vertical, prompt);
+  }
   if (!validation.ok) throw new Error(validation.details.reason);
   const locationLabel = extractLocation(prompt, input.location);
   // Curated anchors (Centurion, Laudium, Sandton, ...) are high confidence and
   // must not depend on a live geocoder call succeeding.
-  const curated = resolveLocationAnchor(prompt);
-  const curatedAnchor = curated.status === "resolved" ? curated.anchor : undefined;
+  const curated = resolveLocationAnchor(locationLabel);
+  const curatedAnchor = curated.status === "resolved" && [curated.anchor.label, curated.anchor.rawName].some(name => name.toLowerCase() === locationLabel.toLowerCase()) ? curated.anchor : undefined;
   const geo = curatedAnchor ? null : await geocodeSouthAfricanPlace(locationLabel, signal ? AbortSignal.any([signal, AbortSignal.timeout(8_000)]) : AbortSignal.timeout(8_000));
   const coordinates = curatedAnchor
     ? { lat: curatedAnchor.lat, lng: curatedAnchor.lng }
     : geo ? parseGeocoderCoordinates(geo) : null;
+  const geocoderNames = geo ? [geo.display_name?.split(",")[0], ...Object.values(geo.address ?? {})] : [];
+  if (!coordinates || (geo && !geocoderNames.some(name => name?.trim().toLowerCase() === locationLabel.toLowerCase()))) {
+    throw new Error("location_needs_clarification");
+  }
   const constraints = extractConstraints(prompt);
   const radiusMatch = prompt.match(/within\s+(\d+(?:\.\d+)?)\s*(?:km|kilomet\w*)/i);
   const radiusKm = radiusMatch ? Number(radiusMatch[1]) : undefined;
+  if (radiusKm !== undefined && (radiusKm <= 0 || radiusKm > 50)) throw new Error("unsupported_search_radius");
   return {
     prompt,
     geography: {
@@ -41,7 +52,7 @@ export async function parseResearchBrief(input: { prompt: string; vertical: stri
       ...(coordinates ?? {}),
       ...(coordinates ? { provider: curatedAnchor ? "registry" : "Nominatim", sourceUrl: curatedAnchor ? undefined : "https://www.openstreetmap.org/" } : {}),
     },
-    vertical: input.vertical,
+    vertical,
     mode: input.mode ?? "site-selection",
     budget: constraints.budget,
     constraints: constraints.constraints,
diff --git a/lib/research-run/candidates.ts b/lib/research-run/candidates.ts
index a7dad08..2cd4932 100644
--- a/lib/research-run/candidates.ts
+++ b/lib/research-run/candidates.ts
@@ -1,16 +1,16 @@
 import type { EvidenceKind } from "./evidence-grades";
-import { normalizeCount, normalizeRange } from "./evidence-grades";
+import { normalizeCount } from "./evidence-grades";
 import type { ClassifiedListings, ListingCandidate } from "./listings";
 import type { EvidenceRecord, ResearchRequest } from "./contracts";
-import { findZoning, findMetroFor } from "@/lib/data/sa-zoning";
-import { findNearestHighway } from "@/lib/data/sa-highway-traffic";
+import { shortlistLimit, siteFit } from "./site-fit";
+
 import { buildFeasibility, type EvidenceScope, type FeasibilityLine } from "./entities";
 
 export type CandidateDecision = "advance" | "investigate" | "reject";
 
 export type ResearchCandidate = {
   id: string;
-  kind: "listing" | "parcel" | "area";
+  kind: "listing" | "parcel" | "area" | "billboard";
   name: string;
   address?: string;
   lat?: number;
@@ -72,36 +72,6 @@ function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: numb
   return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
 }
 
-function listingCoordinates(listing: ListingCandidate): { lat: number; lng: number } | undefined {
-  return listing.coordinates ? { lat: listing.coordinates.lat, lng: listing.coordinates.lng } : undefined;
-}
-
-
-/** Parse a price such as "R 2 160 000", "R2.16m" or "R28 000 000" from web snippets. */
-function parseWebPrice(text: string): number | undefined {
-  const million = text.match(/R\s?([\d.,]+)\s*m\b/i);
-  if (million) {
-    const value = Number(million[1]!.replace(/,/g, ""));
-    if (Number.isFinite(value) && value > 0) return Math.round(value * 1_000_000);
-  }
-  const plain = text.match(/R\s?([\d][\d\s.,]{3,})/);
-  if (plain) {
-    const digits = plain[1]!.replace(/[^\d]/g, "");
-    const value = Number(digits);
-    if (Number.isFinite(value) && value > 1000) return value;
-  }
-  return undefined;
-}
-
-/** Parse an area such as "660 m²" or "3 965 m2". */
-function parseWebArea(text: string): number | undefined {
-  const match = text.match(/([\d][\d\s.,]{1,})\s*m\s*(?:²|2)\b/i);
-  if (!match) return undefined;
-  const value = Number(match[1]!.replace(/[^\d]/g, ""));
-  return Number.isFinite(value) && value > 0 ? value : undefined;
-}
-
-
 /** Vertical weights for "would this LOCATION suit this business" analysis. */
 const LOCATION_FIT_WEIGHTS: Record<string, Partial<Record<EvidenceKind, number>>> = {
   restaurant: { retail: 0.20, food: 0.10, transit: 0.16, amenity: 0.12, traffic: 0.12, school: 0.04, healthcare: 0.06, demographic: 0.12, competitor: -0.16, environment: -0.08 },
@@ -206,215 +176,56 @@ export function buildCandidates(
   const anchor = request.geography.lat !== undefined && request.geography.lng !== undefined
     ? { lat: request.geography.lat, lng: request.geography.lng }
     : undefined;
-  const radiusKm = Number((request as { radiusKm?: number }).radiusKm) || 5;
-  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
+  const radiusKm = request.radiusKm ?? 5;
   const candidates: ResearchCandidate[] = [];
-
-  for (const listing of listings?.eligible ?? []) {
-    const coords = listingCoordinates(listing);
-    const listingEvidence = evidence.filter((item) => item.rawRecordId === listing.id || item.scope === "listing" && item.sourceUrl === listing.canonicalUrl);
-    const reasons: string[] = [];
-    const blockers: string[] = [];
-    const nextActions: string[] = [];
-    let decision: CandidateDecision = "advance";
-
-    // 1. Identity: an approved, exact listing detail is the property identity.
-    if (!listing.url || !listing.title && !listing.address) {
-      decision = "reject";
-      reasons.push("No identifiable property record (no listing title or address).");
-    }
-    // 2. Location: must be verifiable and inside the requested radius.
-    let zoningCategory: string | undefined;
-    let zoningScope: EvidenceScope | undefined;
-    let zoningText: string | undefined;
-    if (!coords) {
-      decision = decision === "reject" ? "reject" : "investigate";
-      reasons.push("Location coordinates are not verified for this property.");
-      blockers.push("Location is unverified.");
-      nextActions.push("Confirm the property pin on the source listing.");
-    } else {
-      if (anchor) {
-        const distance = distanceKm(anchor, coords);
-        if (distance > radiusKm) {
-          decision = "reject";
-          reasons.push(`Property is ${distance.toFixed(1)} km from the requested location (limit ${radiusKm} km).`);
-        }
-      }
-      // 3. Zoning: parcel-scoped polygon hit only.
-      const metro = findMetroFor(coords.lat, coords.lng);
-      const zone = metro ? findZoning(metro.metro, coords.lat, coords.lng) : null;
-      if (zone) {
-        zoningCategory = zone.category;
-        zoningScope = "parcel";
-        zoningText = `${zone.name} · ${zone.permittedUses ?? "see municipal SDF"}`;
-      } else {
-        zoningScope = "area";
-        const nearest = metro ? findNearestHighway(coords.lat, coords.lng) : undefined;
-        if (nearest) {
-          zoningText = "Zoning polygon not confirmed at this coordinate (nearest counted corridor: " + nearest.traffic.ref + ").";
-        }
-      }
-      if (!zone) {
-        if (decision !== "reject") decision = "investigate";
-        reasons.push("Municipal zoning is not confirmed for this exact coordinate.");
-        blockers.push("Zoning is unconfirmed for this parcel.");
-        nextActions.push("Pull the municipal zoning certificate for this erf.");
-      }
-    }
-
-    // 4. Brief criteria from the listing evaluation (fail -> reject, unknown -> investigate).
-    const evaluations = listings?.evaluations?.[listing.id] ?? [];
-    for (const evaluation of evaluations) {
-      if (evaluation.state === "fail") {
-        decision = "reject";
-        reasons.push(`${evaluation.key}: ${evaluation.reason}`);
-      } else if (evaluation.state === "unknown") {
-        if (decision !== "reject") decision = "investigate";
-        reasons.push(`${evaluation.key}: ${evaluation.reason}`);
-        blockers.push(`${evaluation.key} is unverified.`);
-      }
-    }
-    if (listing.price === undefined || listing.price <= 0) {
-      if (decision !== "reject") decision = "investigate";
-      reasons.push("Asking price is not published.");
-      blockers.push("Asking price is unknown.");
+  function inside(point: { lat: number; lng: number } | undefined) {
+    return Boolean(anchor && point && distanceKm(anchor, point) <= radiusKm);
+  }
+  function makeSite(id: string, name: string, point: { lat: number; lng: number }, identity: EvidenceRecord, listing?: ListingCandidate) {
+    const fit = siteFit(request, point, evidence, listing, identity);
+    const feasibility = listing ? buildFeasibility(request.vertical, { ...listing, zoningScope: "area" }) : { lines: [], blockers: [] };
+    const evaluations = listing ? listings?.evaluations[listing.id] ?? [] : [];
+    const blockers = [...new Set([...fit.blockers, ...feasibility.blockers, ...evaluations.filter(e => e.state === "unknown").map(e => e.reason)])];
+    const factors = [...fit.factors];
+    for (const check of evaluations.filter(e => e.state === "pass" && e.key !== "location" && e.key !== "vertical")) {
+      factors.push({ name: check.key === "budget" ? "price" : "amenity", label: "Brief requirement: " + check.key, detail: check.reason + " · " + check.observed, contribution: check.key === "budget" && Number(check.expected) > 0 && listing?.price
+        ? 0.08 + 0.12 * Math.max(0, 1 - listing.price / Number(check.expected)) : 0.08, evidenceIds: [identity.id] });
     }
-
-    const feasibility = buildFeasibility(request.vertical, {
-      landAreaSqm: listing.landAreaSqm,
-      floorAreaSqm: listing.floorAreaSqm,
-      bedrooms: listing.bedrooms,
-      units: listing.units,
-      price: listing.price,
-      zoningCategory,
-      zoningScope,
-      transaction: listing.transaction,
-    });
-    for (const blocker of feasibility.blockers) if (!blockers.includes(blocker)) blockers.push(blocker);
-
-    // Area-level context (corridor traffic, demographics) informs the brief but
-    // is never property evidence.
-    const contextEvidence = evidence.filter((item) => item.scope === "area" || item.scope === "context");
-    const corridor = contextEvidence.find((item) => item.kind === "traffic");
-    const demographics = contextEvidence.find((item) => item.kind === "demographic");
-    const amenityEvidence = evidence.filter((item) => item.scope === "area" && item.grade === "verified");
-    const competitorEvidence = evidence.filter((item) => item.kind === "competitor" || item.kind === "food" && request.vertical === "restaurant");
-
-    const factors: ResearchCandidate["factors"] = [];
-    if (listing.price !== undefined && listing.price > 0) factors.push({ name: "price", label: FACTOR_LABELS.price, contribution: 0, detail: `Advertised at R${listing.price.toLocaleString("en-ZA")}`, evidenceIds: [] });
-    if (listing.landAreaSqm !== undefined) factors.push({ name: "land", label: FACTOR_LABELS.land, contribution: 0, detail: `${listing.landAreaSqm.toLocaleString("en-ZA")} m² land`, evidenceIds: [] });
-    if (listing.bedrooms !== undefined) factors.push({ name: "amenity", label: "Bedrooms stated", contribution: 0, detail: `${listing.bedrooms} bedrooms`, evidenceIds: [] });
-    if (zoningCategory) factors.push({ name: "zoning", label: FACTOR_LABELS.zoning, contribution: 0, detail: zoningText ?? zoningCategory, evidenceIds: [] });
-    if (corridor) factors.push({ name: "traffic", label: FACTOR_LABELS.traffic, contribution: 0, detail: corridor.factualClaim, evidenceIds: [corridor.id] });
-    if (demographics) factors.push({ name: "demographic", label: FACTOR_LABELS.demographic, contribution: 0, detail: demographics.factualClaim, evidenceIds: [demographics.id] });
-    if (amenityEvidence.length) factors.push({ name: "amenity", label: FACTOR_LABELS.amenity, contribution: 0, detail: `${amenityEvidence.length} verified amenity data points within the area`, evidenceIds: amenityEvidence.slice(0, 6).map((item) => item.id) });
-    if (competitorEvidence.length) factors.push({ name: "competitor", label: FACTOR_LABELS.competitor, contribution: 0, detail: `${competitorEvidence.length} competing businesses identified in the area`, evidenceIds: competitorEvidence.slice(0, 6).map((item) => item.id) });
-
-    const verifiedPropertyEvidence = listingEvidence.filter((item) => item.grade === "verified" && (item.scope === "listing" || item.scope === "parcel"));
-    const suitabilitySignals: number[] = [];
-    if (listing.price !== undefined && listing.price > 0) suitabilitySignals.push(0.5);
-    if (listing.landAreaSqm !== undefined) suitabilitySignals.push(0.5);
-    if (zoningScope === "parcel") suitabilitySignals.push(0.5);
-    const suitability = suitabilitySignals.length ? suitabilitySignals.reduce((a, b) => a + b, 0) / 3 : 0;
-    const evidenceReliability = listingEvidence.length ? verifiedPropertyEvidence.length / listingEvidence.length : 0;
-    const established = [
-      Boolean(listing.title || listing.address),
-      Boolean(coords),
-      listing.price !== undefined && listing.price > 0,
-      listing.landAreaSqm !== undefined || listing.floorAreaSqm !== undefined,
-      zoningScope === "parcel",
-      false,
-      false,
-      amenityEvidence.length > 0,
-    ].filter(Boolean).length;
-    const assessmentCompleteness = established / DILIGENCE_CRITERIA.length;
-
-    if (decision === "investigate") nextActions.push("Complete the missing verification before making an offer.");
-    if (!nextActions.length) nextActions.push("Complete town-planning, geotechnical, services and market due diligence before commitment.");
-
+    if (!listing && /budget|under R|for sale|for rent|to lease|at least|minimum/i.test(request.prompt)) blockers.push("Mapped record does not establish the requested commercial or size terms.");
+    if (!listing) blockers.push("Verify the site's availability and current use with the owner.");
+    factors.sort((a, b) => b.contribution - a.contribution);
+    const ids = [...new Set([identity.id, ...factors.flatMap(f => f.evidenceIds)])];
+    const verified = ids.filter(id => evidence.some(record => record.id === id && record.grade === "verified"));
+    const checked = feasibility.lines.filter(line => line.basis === "verified").length;
     candidates.push({
-      id: `lst-${listing.id}`,
-      kind: "listing",
-      name: listing.title ?? listing.address ?? "Approved listing",
-      ...(listing.address ? { address: listing.address } : {}),
-      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
-      source: listing.source,
-      sourceUrl: listing.canonicalUrl,
-      decision,
-      reasons,
-      nextActions,
-      suitability: Number(suitability.toFixed(3)),
-      evidenceReliability: Number(evidenceReliability.toFixed(3)),
-      assessmentCompleteness: Number(assessmentCompleteness.toFixed(3)),
-      feasibility: feasibility.lines,
-      blockers,
-      factors,
-      evidenceIds: listingEvidence.map((item) => item.id),
-      verifiedEvidenceIds: verifiedPropertyEvidence.map((item) => item.id),
-      indicativeEvidenceIds: listingEvidence.filter((item) => item.grade !== "verified").map((item) => item.id),
-      ...(zoningText ? { zoning: zoningText } : {}),
-      ...(zoningCategory ? { zoningCategory } : {}),
-      ...(zoningScope ? { zoningScope } : {}),
-      ...(listing.price !== undefined && listing.price > 0 ? { priceText: `R${listing.price.toLocaleString("en-ZA")}` } : {}),
-      ...(listing.landAreaSqm !== undefined ? { landAreaText: `${listing.landAreaSqm.toLocaleString("en-ZA")} m² land` } : {}),
-      summary: `${decision === "advance" ? "Meets the verified gates for this brief" : decision === "investigate" ? "Requires further verification" : "Does not meet the requested criteria"}`,
+      id, name, ...point, kind: listing ? "listing" : identity.mappedAsset === "billboard" ? "billboard" : "parcel",
+      source: identity.provider, sourceUrl: identity.sourceUrl, address: listing?.address,
+      decision: blockers.length ? "investigate" : "advance", blockers, factors,
+      suitability: Math.min(1, factors.reduce((sum, f) => sum + f.contribution, 0)),
+      evidenceReliability: verified.length / (ids.length + factors.filter(f => f.evidenceIds.length === 0).length),
+      assessmentCompleteness: (2 + checked) / (2 + feasibility.lines.length + blockers.length),
+      reasons: factors.filter(f => f.contribution > 0).map(f => f.label + " · " + f.detail),
+      nextActions: blockers, evidenceIds: ids, verifiedEvidenceIds: verified,
+      indicativeEvidenceIds: ids.filter(id => !verified.includes(id)), feasibility: feasibility.lines,
+      zoning: fit.zoning, zoningScope: "area", summary: "Screened opportunity; verify outstanding requirements.",
+      priceText: listing?.price ? "R" + listing.price.toLocaleString("en-ZA") : undefined,
+      landAreaText: listing?.landAreaSqm ? listing.landAreaSqm.toLocaleString() + " m²" : undefined,
     });
   }
-
-  // Live web research results: real property options found on the open web.
-  // They are verified *findings* (a dated search result with a source URL),
-  // but the exact listing page still has to be confirmed, so they are
-  // "investigate" candidates rather than recommendations.
-  const webLeads = evidence
-    .filter((item) => item.source === "minimax_web_search" && item.factualClaim)
-    .slice(0, 12);
-  const seen = new Set<string>();
-  for (const record of webLeads) {
-    const claim = record.factualClaim;
-    const url = record.sourceUrl;
-    if (!url || seen.has(url)) continue;
-    const price = parseWebPrice(claim);
-    const area = parseWebArea(claim);
-    if (price === undefined && area === undefined) continue;
-    seen.add(url);
-    const title = claim.split(" — ")[0]?.trim() || "Property found by web search";
-    const host = (() => { try { return new URL(url).hostname; } catch { return "source"; } })();
-    candidates.push({
-      id: `web-${record.id}`,
-      kind: "listing",
-      name: title.slice(0, 120),
-      source: host,
-      sourceUrl: url,
-      decision: "investigate",
-      reasons: [`Found by live web search on ${host}; confirm the exact listing page, price and availability before relying on it.`],
-      nextActions: ["Open the source listing and confirm price, size, title deed and zoning.", "Confirm the erf's land-use rights with the municipality."],
-      suitability: 0.35,
-      evidenceReliability: 0.5,
-      assessmentCompleteness: price !== undefined && area !== undefined ? 0.25 : 0.13,
-      feasibility: [
-        { criterion: "Asking price", value: price !== undefined ? `R${price.toLocaleString("en-ZA")}` : "Unknown", basis: price !== undefined ? "indicative" : "unknown", note: "From the live search result snippet." },
-        { criterion: "Land area", value: area !== undefined ? `${area.toLocaleString("en-ZA")} m²` : "Unknown", basis: area !== undefined ? "indicative" : "unknown", note: "From the live search result snippet." },
-        { criterion: "Zoning", value: "Unconfirmed", basis: "unknown" },
-      ],
-      blockers: ["Exact listing page not yet confirmed.", "Zoning not confirmed for this property."],
-      factors: [
-        ...(price !== undefined ? [{ name: "price" as const, label: FACTOR_LABELS.price, contribution: 0, detail: `Advertised around R${price.toLocaleString("en-ZA")}`, evidenceIds: [record.id] }] : []),
-        ...(area !== undefined ? [{ name: "land" as const, label: FACTOR_LABELS.land, contribution: 0, detail: `${area.toLocaleString("en-ZA")} m² land`, evidenceIds: [record.id] }] : []),
-      ],
-      evidenceIds: [record.id],
-      verifiedEvidenceIds: [],
-      indicativeEvidenceIds: [record.id],
-      ...(price !== undefined ? { priceText: `R${price.toLocaleString("en-ZA")}` } : {}),
-      ...(area !== undefined ? { landAreaText: `${area.toLocaleString("en-ZA")} m² land` } : {}),
-      summary: "Live web-search finding — confirm on the source page.",
-    });
-    if (candidates.filter((item) => item.id.startsWith("web-")).length >= 6) break;
+  for (const listing of [...(listings?.eligible ?? []), ...(listings?.conditional ?? [])]) {
+    const identity = evidence.find(e => e.provider === "approved_listing_detail" && e.rawRecordId === listing.id);
+    if (!identity || !listing.coordinates || !inside(listing.coordinates)) continue;
+    if (/vacant|redevelop/i.test(request.prompt) && !/land|plot|erf|stand|redevelop|vacant|brownfield/i.test(listing.title ?? "")) continue;
+    makeSite("lst-" + listing.id, listing.title ?? listing.address ?? listing.id, listing.coordinates, identity, listing);
   }
-
-  // Location-fit candidates: ranked areas, not properties.
-  const locations = buildLocationCandidates(request, evidence, anchor);
-  for (const location of locations) if (!candidates.some((candidate) => candidate.id === location.id)) candidates.push(location);
-
+  for (const asset of evidence) {
+    if (!asset.coordinates || !asset.sourceUrl || !inside(asset.coordinates)) continue;
+    if (!(asset.mappedAsset === "billboard" && request.vertical === "custom:billboard" ||
+          asset.mappedAsset === "brownfield" && /warehouse|industrial/.test(request.vertical))) continue;
+    makeSite(asset.id, asset.factualClaim + " · " + asset.coordinates.lat.toFixed(4) + ", " + asset.coordinates.lng.toFixed(4), asset.coordinates, asset);
+  }
+  if (request.mode === "market-research") candidates.push(...buildLocationCandidates(request, evidence, anchor));
+  candidates.sort((a,b) => b.suitability - a.suitability || b.assessmentCompleteness - a.assessmentCompleteness || a.id.localeCompare(b.id));
   // Area context: where the evidence actually concentrates. Explicitly not sites.
   const withPoints = evidence.filter((item) => item.coordinates && item.grade === "verified" && item.scope === "area");
   const clusters = new Map<string, EvidenceRecord[]>();
@@ -442,5 +253,5 @@ export function buildCandidates(
     };
   }).sort((a, b) => b.verifiedPoints - a.verifiedPoints).slice(0, 5);
 
-  return { candidates, areaContext };
+  return { candidates: candidates.slice(0, shortlistLimit(request.prompt)), areaContext };
 }
diff --git a/lib/research-run/contracts.ts b/lib/research-run/contracts.ts
index 70a7295..60de45a 100644
--- a/lib/research-run/contracts.ts
+++ b/lib/research-run/contracts.ts
@@ -56,6 +56,12 @@ export type EvidenceRecord = {
   scope: EvidenceScope;
   /** Verified = place-specific measurement; Indicative = coarser but usable. */
   grade: EvidenceGrade;
+  freightFacility?: boolean;
+  mappedRoad?: { hgv?: string; maxHeight?: string; maxWeight?: string };
+  residentProfile?: { professionalShare: number; scope: string };
+  mappedAsset?: "billboard" | "brownfield";
+  direction?: string;
+  faceSurvey?: { date: string; vehiclesPerDay: number; target?: string; targetShare?: number };
   factualClaim: string;
   source: string;
   provider: string;
diff --git a/lib/research-run/evidence-grades.ts b/lib/research-run/evidence-grades.ts
index 817a16e..f2555dc 100644
--- a/lib/research-run/evidence-grades.ts
+++ b/lib/research-run/evidence-grades.ts
@@ -68,6 +68,12 @@ export function classifyEvidenceKind(source: string, record: RawSourceRecord): E
   if (source === "competitors") return "competitor";
   if (source === "tavily" || source === "perplexity") return "web";
 
+  const tags = record.tags as Record<string, unknown> | undefined;
+  if (tags?.highway) return "roads";
+  if (tags?.public_transport) return "transit";
+  if (tags?.shop) return "retail";
+  if (tags?.building === "warehouse") return "competitor";
+  if (tags?.landuse === "brownfield") return "land";
   if (has("gas_station", "fuel")) return "fuel";
   if (has("bus_stop", "transit_station", "subway_station", "train_station", "light_rail", "tram")) return "transit";
   if (has("school", "university", "college", "kindergarten")) return "school";
@@ -90,7 +96,7 @@ export function classifyEvidenceKind(source: string, record: RawSourceRecord): E
 /** Verified requires a current, place-specific measurement. */
 export function gradeEvidence(source: string, record: RawSourceRecord): EvidenceGrade {
   if (source === "tavily" || source === "perplexity") return "indicative";
-  if (AREA_CONTEXT_SOURCES.has(source)) return "indicative";
+  if (source === "tomtom_traffic" || source === "i_traffic" || AREA_CONTEXT_SOURCES.has(source)) return "indicative";
   if (LIVE_MEASURED_SOURCES.has(source)) {
     const hasPoint = typeof record.lat === "number" || typeof record.lng === "number"
       || (record.position as { lat?: number } | undefined)?.lat !== undefined
diff --git a/lib/research-run/evidence.ts b/lib/research-run/evidence.ts
index 4f1460e..61b9ff3 100644
--- a/lib/research-run/evidence.ts
+++ b/lib/research-run/evidence.ts
@@ -27,7 +27,7 @@ export function normalizeEvidence(results: SourceResult[], geographyCountry = "S
       const asText = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);
       const tags = (record.tags ?? {}) as Record<string, unknown>;
       const poi = (record.poi ?? {}) as Record<string, unknown>;
-      const name = asText(record.name) ?? asText(record.title) ?? asText(tags.name) ?? asText(poi.name) ?? "source record";
+      const name = asText(record.name) ?? asText(record.title) ?? asText(tags.name) ?? asText(poi.name) ?? asText(tags.ref) ?? asText(tags.advertising) ?? asText(tags.landuse) ?? asText(tags.highway) ?? "source record";
       const detail = asText(record.content) ?? asText(record.address) ?? asText(record.snippet) ?? asText(tags.amenity) ?? asText(tags.shop) ?? asText(poi.type) ?? "";
        const candidateCoordinates = coordinates(record, geographyCountry.toLowerCase() === "south africa");
         const rawUrls = [
@@ -48,7 +48,13 @@ export function normalizeEvidence(results: SourceResult[], geographyCountry = "S
         const grade = gradeEvidence(result.source, record);
         const entity = classifyEntity(result.source, record);
         const scope = scopeForEntity(entity, record);
-        evidence.push({ id: `ev-${result.source}-${index + 1}`, kind, grade, entity, scope, factualClaim: `${name}${detail ? ` — ${detail}` : ""}`, source: result.source, provider: result.source, ...(sourceUrl ? { sourceUrl } : {}), ...(sourceUrls.length ? { sourceUrls } : {}), timestamp: result.fetchedAt, ...(candidateCoordinates ? { coordinates: candidateCoordinates } : {}), sourceStatus: result.status, rawRecordId: `${result.source}:${index}`, fields });
+        evidence.push({ id: result.source === "operator_faces" ? "face-" + String(record.faceId) : `ev-${result.source}-${index + 1}`, kind, grade, entity, scope,
+          ...(result.source === "overpass" && (tags.railway === "freight_terminal" || ["logistics","distribution","freight_terminal"].includes(String(tags.industrial))) ? { freightFacility: true } : {}),
+          ...(result.source === "overpass" && tags.highway ? { mappedRoad: { hgv: asText(tags.hgv), maxHeight: asText(tags.maxheight), maxWeight: asText(tags.maxweight) } } : {}),
+          ...(result.source === "operator_faces" ? { mappedAsset: "billboard" as const, direction: asText(record.direction), faceSurvey: record.faceSurvey as EvidenceRecord["faceSurvey"] } : {}),
+          ...(result.source === "overpass" && tags.advertising === "billboard" ? { mappedAsset: "billboard" as const, direction: asText(tags.direction) } : {}),
+          ...(result.source === "overpass" && tags.landuse === "brownfield" ? { mappedAsset: "brownfield" as const } : {}),
+          factualClaim: `${name}${detail ? ` — ${detail}` : ""}`, source: result.source, provider: result.source, ...(sourceUrl ? { sourceUrl } : {}), ...(sourceUrls.length ? { sourceUrls } : {}), timestamp: result.fetchedAt, ...(candidateCoordinates ? { coordinates: candidateCoordinates } : {}), sourceStatus: result.status, rawRecordId: `${result.source}:${index}`, fields });
     });
   }
   return { evidence, rawRecords };
diff --git a/lib/research-run/face-inventory.ts b/lib/research-run/face-inventory.ts
new file mode 100644
index 0000000..515716c
--- /dev/null
+++ b/lib/research-run/face-inventory.ts
@@ -0,0 +1,28 @@
+import { isValidCoordinates } from "./evidence";
+import { isSafeHttpUrl } from "@/lib/models/evidence-grounding";
+import type { RawSourceRecord } from "./contracts";
+
+/** Operator-supplied inventory, one source URL and one direction per face.
+ * Rows without counts still identify a face. Expired surveys never earn points. */
+export function faceInventory(json: string, now = Date.now()): RawSourceRecord[] {
+  const input: unknown = JSON.parse(json);
+  if (!Array.isArray(input) || input.length > 1000) throw new Error("invalid_face_inventory");
+  const seen = new Set<string>();
+  const rows: RawSourceRecord[] = [];
+  for (const face of input) {
+    if (!face || typeof face.name !== "string" || typeof face.id !== "string" || !face.id.trim() ||
+        typeof face.direction !== "string" || !face.direction.trim() || typeof face.sourceUrl !== "string" ||
+        !isSafeHttpUrl(face.sourceUrl) || !isValidCoordinates({lat: face.lat, lng: face.lng}, true) || seen.has(face.id)) continue;
+    seen.add(face.id);
+    const survey = face.survey;
+    const age = now - Date.parse(survey?.date);
+    const usable = survey && age >= 0 && age <= 365 * 86400000 &&
+      typeof survey.vehiclesPerDay === "number" && Number.isFinite(survey.vehiclesPerDay) && survey.vehiclesPerDay >= 0;
+    rows.push({ name: face.name, lat: face.lat, lng: face.lng, sourceUrl: face.sourceUrl, direction: face.direction, faceId: face.id,
+      ...(usable ? { faceSurvey: { date: survey.date, vehiclesPerDay: survey.vehiclesPerDay,
+        ...(typeof survey.target === "string" && survey.target.trim() && Number.isFinite(survey.targetShare) && survey.targetShare >= 0 && survey.targetShare <= 1 ? { target: survey.target, targetShare: survey.targetShare } : {}),
+      } } : {}),
+    });
+  }
+  return rows;
+}
diff --git a/lib/research-run/listings/acquisition.ts b/lib/research-run/listings/acquisition.ts
index 18aa96b..c571e64 100644
--- a/lib/research-run/listings/acquisition.ts
+++ b/lib/research-run/listings/acquisition.ts
@@ -1,5 +1,6 @@
 import { APPROVED_LISTING_SOURCES, listingSourceLead, sourceForUrl, type ApprovedListingSource } from "./registry";
 import { classifyListingUrl, normalizeListingUrl } from "./urls";
+import { detailPin } from "./detail-pin";
 import { parseListingText } from "./parser";
 import type { ListingCandidate, ListingProvider, ListingSearchDiagnostics, ListingSourceLead, ListingSourceStatus } from "./types";
 import type { ResearchRequest } from "../contracts";
@@ -18,7 +19,10 @@ async function boundedText(response: Response, maxBytes: number): Promise<string
   if (!response.body) return ""; const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
   try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > maxBytes) { await reader.cancel(); throw new Error("body_bytes_exceeded"); } chunks.push(part.value); } } finally { reader.releaseLock(); }
   const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
-  return new TextDecoder().decode(bytes).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
+  return new TextDecoder().decode(bytes);
+}
+function pageText(html: string) {
+  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
 }
 function queryFor(request: ResearchRequest, source: ApprovedListingSource) {
   // Search for the asset class the brief implies, not the vertical label.
@@ -31,7 +35,10 @@ function queryFor(request: ResearchRequest, source: ApprovedListingSource) {
         : /retail|shop|store|mall/i.test(request.vertical)
           ? "vacant retail land OR commercial development site OR shopping centre development"
           : "vacant land OR development site OR residential land for sale";
-  return [request.prompt, request.geography.label, intent, `site:${source.host}`].join(" ").slice(0, 480);
+  const propertyIntent = /apartment|flat|townhouse|house for (sale|rent)/i.test(request.prompt) && !/develop|redevelop/i.test(request.prompt)
+    ? "residential property apartment house" : intent;
+  const asset = request.vertical === "custom:billboard" ? "road frontage advertising site billboard land" : propertyIntent;
+  return [request.geography.label.split(",")[0], asset, request.prompt, `site:${source.host}`].join(" ").slice(0, 390);
 }
 function status(error: unknown, signal: AbortSignal): ListingSourceStatus { if (signal.aborted || error instanceof Error && error.name === "AbortError") return "timeout"; if (error instanceof Error && /missing|api key/i.test(error.message)) return "unavailable"; return "error"; }
 function lead(source: ApprovedListingSource, url: string, observedAt: string, kind: ListingSourceLead["kind"], reason: string) { return listingSourceLead(source, url, observedAt, kind, reason); }
@@ -53,18 +60,18 @@ const tavilyProvider: ListingSearchProvider = {
 export async function acquireListings(request: ResearchRequest, options: ListingAcquisitionOptions = {}): Promise<ListingAcquisitionResult> {
   const config = { ...DEFAULTS, ...options }; const fetcher = options.fetcher ?? fetch; const tavilyKey = options.apiKey ?? process.env.TAVILY_API_KEY; const provider: ListingSearchProvider | undefined = tavilyKey ? tavilyProvider : undefined; const budget = options.budget ?? createListingProviderBudget();
   const resolvedCountry = countryCode(request.geography.country);
-  const selected = APPROVED_LISTING_SOURCES.filter((source) => supportsCountry(source, resolvedCountry)).slice(0, config.maxSources);
+  const selected = APPROVED_LISTING_SOURCES.filter((source) => supportsCountry(source, resolvedCountry)).sort((a,b) => Number(b.rights === "detail_fetch") - Number(a.rights === "detail_fetch")).slice(0, config.maxSources);
   const diagnostics: ListingSearchDiagnostics["sources"] = selected.map((source) => ({ source: source.name, status: "empty" as ListingSourceStatus, queries: 0, results: 0, rejectedUrls: 0, rejectedReasons: {}, latencyMs: 0 }));
   if (!selected.length) diagnostics.push({ source: `listing-country:${resolvedCountry || "unknown"}`, status: "unavailable", queries: 0, results: 0, rejectedUrls: 0, rejectedReasons: {}, latencyMs: 0, error: "no_approved_listing_sources_for_resolved_country" });
-  const candidates: ListingCandidate[] = []; const leads: ListingSourceLead[] = []; let next = 0;
-  const runSource = async () => { while (next < selected.length) { const index = next++; const source = selected[index]; const diagnostic = diagnostics[index]; const started = Date.now();
+  const candidates: ListingCandidate[] = []; const leads: ListingSourceLead[] = []; let next = 0; let end = selected.length;
+  const runSource = async () => { while (!options.signal?.aborted && next < end) { const index = next++; const source = selected[index]; const diagnostic = diagnostics[index]; const started = Date.now();
     diagnostic.provider = provider?.name;
     if (!provider) { diagnostic.status = "unavailable"; diagnostic.error = "no_listing_search_provider_configured"; diagnostic.latencyMs = Date.now() - started; continue; }
     if (!budget.consume("search")) { diagnostic.status = "unavailable"; diagnostic.error = "listing_provider_budget_exhausted"; diagnostic.latencyMs = Date.now() - started; continue; }
     diagnostic.queries = 1; const controller = new AbortController(); const abort = () => controller.abort(); const timer = setTimeout(() => controller.abort(), config.timeoutMs); options.signal?.addEventListener("abort", abort, { once: true });
     try {
       const results = await provider.search(queryFor(request, source), source, { fetcher, signal: controller.signal, maxResults: config.maxResultsPerQuery, maxBodyBytes: config.maxBodyBytes, apiKey: tavilyKey }); const observedAt = new Date().toISOString(); const seen = new Set<string>();
-      for (const result of results) { if (diagnostic.results >= config.maxResultsPerQuery) break; diagnostic.results++; const rawUrl = typeof result.url === "string" ? result.url : ""; const classification = classifyListingUrl(rawUrl); const canonical = classification.canonicalUrl;
+      for (const result of results) { if (options.signal?.aborted || diagnostic.results >= config.maxResultsPerQuery) break; diagnostic.results++; const rawUrl = typeof result.url === "string" ? result.url : ""; const classification = classifyListingUrl(rawUrl); const canonical = classification.canonicalUrl;
         if (!canonical || classification.kind === "invalid") { diagnostic.rejectedUrls++; const reason = classification.reason ?? "invalid-url"; diagnostic.rejectedReasons[reason] = (diagnostic.rejectedReasons[reason] ?? 0) + 1; continue; }
         if (seen.has(canonical)) continue; seen.add(canonical); const foundSource = sourceForUrl(canonical) ?? source;
         if (classification.kind !== "detail") { leads.push(lead(foundSource, canonical, observedAt, classification.kind === "category" ? "category" : "area", classification.reason ?? "not-detail")); continue; }
@@ -76,7 +83,7 @@ export async function acquireListings(request: ResearchRequest, options: Listing
           const detailResponse = await fetcher(canonical, { method: "GET", signal: detailController.signal, cache: "no-store" }); const finalUrl = detailResponse.url || canonical; const final = new URL(finalUrl); const expected = new URL(canonical);
           const finalHost = final.hostname.toLowerCase().replace(/^www\./, ""); const expectedHost = expected.hostname.toLowerCase().replace(/^www\./, "");
           if (!detailResponse.ok) throw new Error(`detail_http_${detailResponse.status}`); if (final.protocol !== "https:" || finalHost !== expectedHost || normalizeListingUrl(final.href) !== canonical || classifyListingUrl(final.href).kind !== "detail") throw new Error("detail_final_url_rejected");
-           const detailText = await boundedText(detailResponse, config.maxBodyBytes); if (detailText.length < 50) throw new Error("detail_parse_failed"); const parsed = parseListingText({ source: foundSource.name, url: canonical, title: result.title, body: detailText, observedAt: new Date().toISOString(), rightsPolicy: { operation: "detail_fetch", reviewedAt: foundSource.reviewedAt!, policyId: foundSource.policyId! } }); if (!parsed) throw new Error("detail_parse_failed"); candidates.push(parsed);
+           const html = await boundedText(detailResponse, config.maxBodyBytes); const pin = detailPin(html); const detailText = pageText(html); if (detailText.length < 50) throw new Error("detail_parse_failed"); const parsed = parseListingText({ source: foundSource.name, url: canonical, title: result.title, body: detailText, observedAt: new Date().toISOString(), rightsPolicy: { operation: "detail_fetch", reviewedAt: foundSource.reviewedAt!, policyId: foundSource.policyId! } }); if (!parsed) throw new Error("detail_parse_failed"); candidates.push(pin ? { ...parsed, coordinates: pin } : parsed);
         } catch (error) { leads.push(lead(foundSource, canonical, observedAt, "detail-unverified", `detail_fetch_or_parse_failed:${error instanceof Error ? error.message : "unknown"}`)); }
         finally { clearTimeout(detailTimer); options.signal?.removeEventListener("abort", detailAbort); }
       }
@@ -84,7 +91,14 @@ export async function acquireListings(request: ResearchRequest, options: Listing
     } catch (error) { diagnostic.status = status(error, controller.signal); diagnostic.error = error instanceof Error ? error.message.slice(0, 160) : "source_failed"; }
     finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); diagnostic.latencyMs = Date.now() - started; }
   } };
-  await Promise.all(Array.from({ length: Math.min(config.concurrency, selected.length || 1) }, runSource));
+  // Let detail-authorised portals finish first so faster link-only portals
+  // cannot consume the remaining requests before a property page is fetched.
+  const detailCount = selected.findIndex(source => source.rights !== "detail_fetch");
+  const primaryCount = detailCount < 0 ? selected.length : detailCount;
+  end = primaryCount;
+  await Promise.all(Array.from({ length: Math.min(config.concurrency, end) }, runSource));
+  end = selected.length;
+  await Promise.all(Array.from({ length: Math.min(config.concurrency, end - next) }, runSource));
   const uniqueCandidates = [...new Map(candidates.slice(0, config.maxUrls).map((item) => [item.canonicalUrl, item])).values()]; const uniqueLeads = [...new Map(leads.slice(0, config.maxUrls).map((item) => [item.canonicalUrl, item])).values()];
   return { candidates: uniqueCandidates, sourceLeads: uniqueLeads, diagnostics: { sources: diagnostics, searchedUrls: diagnostics.reduce((sum, item) => sum + item.results, 0), detailUrls: uniqueCandidates.length, exactListings: uniqueCandidates.length, sourceLeads: uniqueLeads.length, budget: { cap: budget.cap, used: budget.used, searchQueries: budget.searchQueries, detailFetches: budget.detailFetches, remaining: Math.max(0, budget.cap - budget.used) }, limits: { maxSources: config.maxSources, maxQueriesPerSource: config.maxQueriesPerSource, maxResultsPerQuery: config.maxResultsPerQuery, maxUrls: config.maxUrls, maxBodyBytes: config.maxBodyBytes, concurrency: config.concurrency, timeoutMs: config.timeoutMs } } };
 }
diff --git a/lib/research-run/listings/detail-pin.ts b/lib/research-run/listings/detail-pin.ts
new file mode 100644
index 0000000..c20e963
--- /dev/null
+++ b/lib/research-run/listings/detail-pin.ts
@@ -0,0 +1,33 @@
+import { isValidCoordinates } from "../evidence";
+
+/** Only the main property's published GeoCoordinates. Ignore offices, nearby
+ * places, recommendations and ambiguous pages with multiple property pins. */
+export function detailPin(html: string): {lat: number; lng: number} | undefined {
+  const pins = new Map<string, {lat: number; lng: number}>();
+  function visit(value: unknown) {
+    if (!value || typeof value !== "object") return;
+    if (Array.isArray(value)) { value.forEach(visit); return; }
+    const node = value as Record<string, unknown>;
+    visit(node["@graph"]);
+    visit(node.mainEntity);
+    const types = [node["@type"]].flat().map(String);
+    if (!types.some(t => /^(House|Apartment|Residence|SingleFamilyResidence|Accommodation|RealEstateListing|Landform)$/i.test(t))) return;
+    const geo = node.geo as Record<string, unknown> | undefined;
+    if (!geo || ![geo.latitude, geo.longitude].every(n => typeof n === "number" || typeof n === "string" && n.trim() !== "")) return;
+    const point = { lat: Number(geo.latitude), lng: Number(geo.longitude) };
+    if (isValidCoordinates(point, true)) pins.set(point.lat + "," + point.lng, point);
+  }
+  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
+    try { visit(JSON.parse(match[1])); } catch { /* malformed structured data provides no pin */ }
+  }
+  // Paired place:location Open Graph tags describe the canonical page.
+  const meta = new Map<string, number>();
+  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
+    const key = /\bproperty=["']place:location:(latitude|longitude)["']/i.exec(tag)?.[1]?.toLowerCase();
+    const val = /\bcontent=["'](-?\d+(?:\.\d+)?)["']/i.exec(tag)?.[1];
+    if (key && val) meta.set(key, Number(val));
+  }
+  const point = { lat: meta.get("latitude"), lng: meta.get("longitude") };
+  if (isValidCoordinates(point, true)) pins.set(point.lat + "," + point.lng, point);
+  return pins.size === 1 ? pins.values().next().value : undefined;
+}
diff --git a/lib/research-run/listings/match.ts b/lib/research-run/listings/match.ts
index a627faf..fb8dfae 100644
--- a/lib/research-run/listings/match.ts
+++ b/lib/research-run/listings/match.ts
@@ -11,21 +11,23 @@ export function parseListingConstraints(request: ResearchRequest): ListingConstr
   const geography = request.geography.label.split(",")[0].trim(); if (geography) out.locations.push(geography);
   const locations = text.match(/(?:in|near|around|at)\s+([A-Z][A-Za-z .'-]{2,40})/g) ?? []; for (const item of locations) { const value = item.replace(/^(in|near|around|at)\s+/i, "").trim(); if (value && !out.locations.some((x) => normalize(x) === normalize(value))) out.locations.push(value); }
   if (/\b(?:rent|rental|lease|let|to let)\b/i.test(text)) out.transaction = "lease"; else if (/\b(?:sale|buy|purchase|acqui)\w*\b/i.test(text)) out.transaction = "sale";
-  const budget = /(?:under|below|maximum|max|budget(?:\s+of)?)\s*(?:([A-Z]{3}|R)\s*)?(\d[\d\s,.]*)\s*(k|m|million)?/i.exec(text); if (budget) out.budget = { amount: amount(budget[2], budget[3]), currency: "ZAR", scope: /month|monthly|pm|per\s*month/i.test(text) ? "periodic" : "total", ...( /month|monthly|pm|per\s*month/i.test(text) ? { period: "month" } : {}) };
+  const budget = /(?:under|below|maximum|max|budget(?:\s+of)?)\s*(?:([A-Z]{3}|R)\s*)?(\d[\d\s,.]*)\s*(k|m|million)?/i.exec(text); if (budget && !/^\s*(?:km|sqm|m²|m2|hectares?|ha|bedrooms?|units?)\b/i.test(text.slice(budget.index + budget[0].length))) out.budget = { amount: amount(budget[2], budget[3]), currency: "ZAR", scope: /month|monthly|pm|per\s*month/i.test(text) ? "periodic" : "total", ...( /month|monthly|pm|per\s*month/i.test(text) ? { period: "month" } : {}) };
   const bedrooms = /\b(\d+)\s*(?:bed|bedroom)s?\b/i.exec(text); if (bedrooms) out.bedrooms = Number(bedrooms[1]); const units = /\b(\d+)\s*(?:units?|flats?|apartments?)\b/i.exec(text); if (units) out.units = Number(units[1]);
-  const landText = /(?:land|erf|plot|site|stand)[^.;,]{0,70}/i.exec(text)?.[0]; const floorText = /(?:floor|building|gla|internal)[^.;,]{0,70}/i.exec(text)?.[0]; if (landText) out.landArea = area(landText, "land") ?? { unit: "m2" }; if (floorText) out.floorArea = area(floorText, "floor") ?? { unit: "m2" };
+  const landText = /(?:land|erf|plot|site|stand)[^.;,]{0,70}/i.exec(text)?.[0]; const floorText = /(?:floor|building|gla|internal)[^.;,]{0,70}/i.exec(text)?.[0]; if (landText) out.landArea = area(landText, "land"); if (floorText) out.floorArea = area(floorText, "floor");
   return out;
 }
 function compareArea(value: number | undefined, range: { min?: number; max?: number }, key: ListingCriterionKey, expected: string) { return value === undefined || (range.min === undefined && range.max === undefined) ? criterion(key, "unknown", value === undefined ? "area unit or value is not stated" : "request area bound is not specified; stated area is not treated as a match", expected, value === undefined ? undefined : String(value)) : criterion(key, (range.min !== undefined && value < range.min) || (range.max !== undefined && value > range.max) ? "fail" : "pass", "area compared in square metres", expected, String(value)); }
 export function evaluateListing(candidate: ListingCandidate, request: ResearchRequest): ListingCriterionEvaluation[] {
   const constraints = parseListingConstraints(request); const out: ListingCriterionEvaluation[] = []; const candidateLocation = normalize(candidate.location ?? candidate.suburb ?? candidate.address ?? "");
-  if (constraints.locations.length) { const matches = constraints.locations.some((location) => candidateLocation.includes(normalize(location))); out.push(candidateLocation ? criterion("location", matches ? "pass" : "fail", matches ? "source location matches a requested location" : "source location differs from every requested location", constraints.locations.join(" | "), candidate.location ?? candidate.suburb) : criterion("location", "unknown", "source did not state a requested location", constraints.locations.join(" | "))); }
-  else out.push(criterion("location", "unknown", "request did not specify a location"));
+  const spatialGate = candidate.coordinates && request.geography.lat !== undefined && request.geography.lng !== undefined;
+  if (request.radiusKm !== undefined && !spatialGate) out.push(criterion("location", "unknown", "A listing pin is needed to verify the requested radius"));
+  if (!spatialGate && constraints.locations.length) { const matches = constraints.locations.some((location) => candidateLocation.includes(normalize(location))); out.push(candidateLocation ? criterion("location", matches ? "pass" : "fail", matches ? "source location matches a requested location" : "source location differs from every requested location", constraints.locations.join(" | "), candidate.location ?? candidate.suburb) : criterion("location", "unknown", "source did not state a requested location", constraints.locations.join(" | "))); }
+  else if (!spatialGate) out.push(criterion("location", "unknown", "request did not specify a location"));
   // Geographic gate: a property in another city/province is rejected outright,
   // even when the listing text is otherwise plausible.
   if (candidate.coordinates && request.geography.lat !== undefined && request.geography.lng !== undefined) {
     const distance = haversineKm({ lat: request.geography.lat, lng: request.geography.lng }, { lat: candidate.coordinates.lat, lng: candidate.coordinates.lng });
-    const radiusKm = request.radiusKm ?? 10;
+    const radiusKm = request.radiusKm ?? 5;
     out.push(criterion("location", distance <= radiusKm ? "pass" : "fail", distance <= radiusKm ? "property is inside the requested radius" : `property is ${distance.toFixed(1)} km from the requested location`, `${radiusKm} km`, `${distance.toFixed(1)} km`));
   } else if (request.geography.label && candidateLocation) {
     // Compare place tokens in both directions: "Rosebank" must match a
@@ -41,7 +43,7 @@ export function evaluateListing(candidate: ListingCandidate, request: ResearchRe
   if (constraints.units !== undefined) out.push(candidate.units === undefined ? criterion("units", "unknown", "unit count is not stated", String(constraints.units)) : criterion("units", candidate.units >= constraints.units ? "pass" : "fail", "unit count compared with request", String(constraints.units), String(candidate.units)));
   if (constraints.landArea) out.push(compareArea(candidate.landAreaSqm, constraints.landArea, "landArea", JSON.stringify(constraints.landArea)));
   if (constraints.floorArea) out.push(compareArea(candidate.floorAreaSqm, constraints.floorArea, "floorArea", JSON.stringify(constraints.floorArea)));
-  const requested = request.vertical.replace(/_/g, " ").toLowerCase(); out.push(candidate.vertical ? criterion("vertical", requested.includes(candidate.vertical) || candidate.vertical.includes(requested.split(" ")[0]) ? "pass" : "fail", "source vertical compared with requested vertical", requested, candidate.vertical) : criterion("vertical", "unknown", "listing source does not establish the requested development vertical", requested));
+  const requested = request.vertical.replace(/_/g, " ").toLowerCase(); out.push(candidate.vertical === "land" && /warehouse|industrial|billboard|restaurant|gas station/.test(requested) ? criterion("vertical", "unknown", "Land identified; development rights need verification") : candidate.vertical ? criterion("vertical", (/warehouse|industrial/.test(requested) && /^(industrial|warehouse)$/.test(candidate.vertical)) || requested.includes(candidate.vertical) || candidate.vertical.includes(requested.split(" ")[0]) ? "pass" : "fail", "source vertical compared with requested vertical", requested, candidate.vertical) : criterion("vertical", "unknown", "listing source does not establish the requested development vertical", requested));
   return out;
 }
 export function classifyListings(candidates: ListingCandidate[], sourceLeads: ListingSourceLead[], request: ResearchRequest): ClassifiedListings { const evaluations: Record<string, ListingCriterionEvaluation[]> = {}; const eligible: ListingCandidate[] = []; const conditional: ListingCandidate[] = []; const excluded: ListingCandidate[] = []; for (const candidate of candidates) { const checks = evaluateListing(candidate, request); evaluations[candidate.id] = checks; const fails = checks.some((item) => item.state === "fail"); const unknowns = checks.some((item) => item.state === "unknown"); if (!fails && !unknowns) eligible.push(candidate); else if (!fails) conditional.push(candidate); else excluded.push(candidate); } return { eligible, conditional, excluded, sourceLeads, evaluations, noMatchExplanations: eligible.length ? [] : [candidates.length ? "No exact detail listing passed every requested criterion; unknown fields were not treated as matches." : "No approved source returned an exact, extractable detail listing."] }; }
diff --git a/lib/research-run/listings/parser.ts b/lib/research-run/listings/parser.ts
index f138424..b889c84 100644
--- a/lib/research-run/listings/parser.ts
+++ b/lib/research-run/listings/parser.ts
@@ -13,7 +13,7 @@ export function parseListingText(input: { title?: string; body: string; url: str
   const text = `${input.title ?? ""} ${input.body}`.replace(/\s+/g, " ").trim();
   if (!text) return null;
   const evidence: ListingEvidenceSpan[] = [];
-  const price = firstMatch(text, /(?:R|ZAR)\s*([\d\s,.]+)\s*(k|m|million)?\b/i);
+  const price = firstMatch(text, /\b(?:ZAR|R)\s*(\d[\d ,.]*\d|\d)\s*(k|m|million)?\b/i);
   const priceAmount = price ? price.value * (/k/i.test(price.match[2] ?? "") ? 1_000 : /m|million/i.test(price.match[2] ?? "") ? 1_000_000 : 1) : undefined;
   if (price) add(evidence, "price", price.text, price.match.index!);
   const context = price ? text.slice(Math.max(0, price.match.index! - 90), price.match.index! + price.text.length + 90) : text;
@@ -24,9 +24,9 @@ export function parseListingText(input: { title?: string; body: string; url: str
   if (transactionMatch) add(evidence, "transaction", transactionMatch[0], transactionMatch.index!);
   const period = /month|monthly|pm|per\s*month/i.test(context) ? "month" : /week|weekly|pw/i.test(context) ? "week" : /day|daily/i.test(context) ? "day" : transaction === "sale" ? "total" : undefined;
   let landAreaSqm: number | undefined; let floorAreaSqm: number | undefined;
-  const areas = /(?:\d[\d,.]*\s*(?:m²|m2|sqm|square\s+met(?:re|er)s?|ha|hectare|hectares))/gi;
+  const areas = /(?:(?:\d{1,3}(?: \d{3})+|\d[\d,.]*)\s*(?:m²|m2|sqm|square\s+met(?:re|er)s?|ha|hectare|hectares))/gi;
   for (const match of text.matchAll(areas)) {
-    const raw = match[0]; const value = number(match[0].match(/[\d,.]+/)?.[0] ?? "0") * (/ha|hectare/i.test(raw) ? 10_000 : 1);
+    const raw = match[0]; const value = number(match[0].match(/[\d][\d ,.]*/)?.[0] ?? "0") * (/ha|hectare/i.test(raw) ? 10_000 : 1);
     const before = text.slice(Math.max(0, match.index! - 36), match.index!); const after = text.slice(match.index! + raw.length, match.index! + raw.length + 36);
     const immediate = after.match(/^\s*(land|erf|plot|site|stand\s*size|floor|building|gla|internal)\b/i)?.[1].toLowerCase();
     const window = `${before} ${after}`.toLowerCase(); const landIndex = window.lastIndexOf("land"); const floorIndex = window.lastIndexOf("floor");
diff --git a/lib/research-run/model-synthesis.ts b/lib/research-run/model-synthesis.ts
index 7d2f747..bdeeedc 100644
--- a/lib/research-run/model-synthesis.ts
+++ b/lib/research-run/model-synthesis.ts
@@ -96,7 +96,7 @@ export function deterministicSynthesis(candidates: ResearchCandidate[], evidence
   });
   return {
     status: "partial_result",
-    executiveAnswer: `Atlas identified ${usable.length} propert${usable.length === 1 ? "y" : "ies"} that pass the location and property gates${candidates.length - usable.length ? ` and rejected ${candidates.length - usable.length} that failed them` : ""}. AI commentary was unavailable, so the reasoning is deterministic.`,
+    executiveAnswer: `Atlas shortlisted ${usable.length} source-backed candidate${usable.length === 1 ? "" : "s"} for investigation${candidates.length - usable.length ? ` and rejected ${candidates.length - usable.length} that failed them` : ""}. AI commentary was unavailable, so the reasoning is deterministic.`,
     options,
     whySelected: "Only properties that pass the identity, location and brief gates are shown.",
     risks: options.flatMap((option) => option.risks).slice(0, 8),
@@ -104,7 +104,7 @@ export function deterministicSynthesis(candidates: ResearchCandidate[], evidence
     nextActions: ["Verify title, zoning, price and availability with the source.", "Confirm bulk services, access and environmental constraints before offer."],
     evidenceIds: [...new Set(options.flatMap((option) => option.evidenceIds))].slice(0, MAX_ARRAY),
     unverifiedExplanation: `Model synthesis unavailable (${reason}).`,
-    providerAttempts,
+    ...(providerAttempts.length ? { providerAttempts } : {}),
   };
 }
 
@@ -274,6 +274,10 @@ Rules:
       return candidates.length ? deterministicSynthesis(candidates, evidence, attempts, "model option did not match the required schema") : fallback("minimax_option_schema_invalid", evidence.length, attempts);
     }
     const options = checkedOptions.filter((item): item is ResearchSynthesisOption => item !== null);
+    const orderedIds = candidates.filter(c => c.decision !== "reject").map(c => c.id);
+    if (orderedIds.length && (options.length !== orderedIds.length || options.some((option, index) => option.optionId !== orderedIds[index]))) {
+      return deterministicSynthesis(candidates, evidence, [], "model options differed from the screened shortlist");
+    }
     if (parsed.status === "no_verified_match" && options.length > 0) {
       const attempts = [attempt("parse", responseStatus)];
       return candidates.length ? deterministicSynthesis(candidates, evidence, attempts, "model status was inconsistent with its options") : fallback("minimax_status_inconsistent", evidence.length, attempts);
diff --git a/lib/research-run/run.ts b/lib/research-run/run.ts
index 41e966b..fa0cb81 100644
--- a/lib/research-run/run.ts
+++ b/lib/research-run/run.ts
@@ -7,6 +7,7 @@ import { buildCandidates } from "./candidates";
 import { fetchMiniMaxWebSearch } from "./web-search";
 import { makeProviderAttempt } from "@/lib/provider-attempts";
 import { RESEARCH_RUN_BUDGET, ResearchBudgetError, createProviderCallBudget } from "./budget";
+import { statsSAConnector } from "@/lib/connectors/stats_sa";
 import { allAdapters } from "./adapters";
 import { isUnavailableWithoutEvidence } from "./route-policy";
 import { acquireListings, classifyListings } from "./listings";
@@ -67,12 +68,22 @@ export async function runResearchV1(input: { prompt: string; vertical: string; m
        // Conditional, failed, and unknown listings are UI/audit records only.
        // Keeping them out of this array makes it impossible for Luna to cite
        // an over-budget or otherwise rejected listing as a recommendation.
-       const listingEvidence = listingClassification?.eligible.map(listingToEvidence) ?? [];
+       const listingEvidence = [...(listingClassification?.eligible ?? []), ...(listingClassification?.conditional ?? [])].map(listingToEvidence);
       normalized.evidence.push(...listingEvidence);
       normalized.rawRecords.listings = listingOutcome.candidates as unknown as Record<string, unknown>[];
     }
     // Rank real, evidence-backed candidates (verified listings + clustered live
     // data points). No catalog rows can enter this list.
+    const points = new Map(normalized.evidence.filter(e => e.coordinates && (e.mappedAsset || e.provider === "approved_listing_detail")).map(e => [e.coordinates!.lat + "," + e.coordinates!.lng, e.coordinates!]));
+    for (const [id, point] of points) {
+      const signals = await statsSAConnector.fetch({ vertical: "all" as never, location: point, site: { ...point, id, name: id } });
+      const profile = signals.find(s => s.type === "demographic_profile");
+      if (!profile) continue;
+      normalized.evidence.push({ id: "demo-" + id, kind: "demographic", entity: "demographic_area", scope: "area",
+        ...(typeof profile.payload?.professionalShare === "number" ? { residentProfile: { professionalShare: profile.payload.professionalShare, scope: profile.scope ?? "area" } } : {}),
+        grade: "indicative", factualClaim: profile.label + " (curated resident profile)", source: "stats_sa", provider: "stats_sa",
+        timestamp: profile.fetchedAt, coordinates: point, sourceStatus: "ok", rawRecordId: profile.id, fields: {} });
+    }
     const { candidates, areaContext } = buildCandidates(request, normalized.evidence, listingClassification);
      if (listingOutcome && listingClassification) { listingOutcome.diagnostics.sources.forEach((source) => void trackDecisionEvent("listing_source_status", { runId: telemetry?.runId, userId: telemetry?.userId, mode: request.mode, outcomeState: source.status, metadata: { source: source.source, provider: source.provider ?? null, queries: source.queries, results: source.results, rejectedUrls: source.rejectedUrls } }).catch(() => undefined)); void trackDecisionEvent("listing_search_completed", { runId: telemetry?.runId, userId: telemetry?.userId, mode: request.mode, latencyMs: Date.now() - startedAt, outcomeState: listingClassification.eligible.length ? "exact" : listingClassification.conditional.length ? "conditional" : "lead_only", metadata: { searchQueries: listingOutcome.diagnostics.budget.searchQueries, detailFetches: listingOutcome.diagnostics.budget.detailFetches, exactCount: listingClassification.eligible.length, conditionalCount: listingClassification.conditional.length, leadCount: listingClassification.sourceLeads.length, rejectedUrlCount: listingOutcome.diagnostics.sources.reduce((sum, item) => sum + item.rejectedUrls, 0), activation: listingClassification.eligible.length + listingClassification.conditional.length > 0 } }).catch(() => undefined); }
      const listingEnvelope = listingOutcome && listingClassification ? { listingSearch: { ...listingOutcome.diagnostics, conditionalListings: listingClassification.conditional.length }, exactListings: listingClassification.eligible, conditionalListings: listingClassification.conditional, excludedListings: listingClassification.excluded, sourceLeads: listingClassification.sourceLeads, criterionEvaluations: listingClassification.evaluations, noMatchExplanations: listingClassification.noMatchExplanations } : {};
diff --git a/lib/research-run/site-fit.ts b/lib/research-run/site-fit.ts
new file mode 100644
index 0000000..ad9622c
--- /dev/null
+++ b/lib/research-run/site-fit.ts
@@ -0,0 +1,93 @@
+import type { EvidenceRecord, ResearchRequest } from "./contracts";
+import type { ResearchCandidate } from "./candidates";
+import type { ListingCandidate } from "./listings/types";
+import { haversineKm } from "@/lib/location/registry";
+import { findNearestHighway } from "@/lib/data/sa-highway-traffic";
+import { findMetroFor, findZoning } from "@/lib/data/sa-zoning";
+
+type Point = { lat: number; lng: number };
+type Factor = ResearchCandidate["factors"][number];
+export function shortlistLimit(prompt: string) {
+  const count = /\b(?:top\s+)?(\d+)(?:\s*[-–—]\s*(\d+))?\s+(?:vacant\s+(?:or\s+redevelopment\s+)?|redevelopment\s+|industrial\s+|residential\s+)?(?:sites|locations|plots|properties|apartments|billboards|options)\b/i.exec(prompt);
+  return Math.min(20, Math.max(1, Number(count?.[2] ?? count?.[1] ?? 5)));
+}
+
+export function siteFit(request: ResearchRequest, point: Point, evidence: EvidenceRecord[], listing?: ListingCandidate, asset?: EvidenceRecord) {
+  const billboard = request.vertical === "custom:billboard";
+  const industrial = /warehouse|industrial|logistics/.test(request.vertical);
+  const factors: Factor[] = [];
+  const blockers: string[] = [];
+  function add(name: Factor["name"], label: string, detail: string, contribution: number, ids: string[] = []) {
+    factors.push({ name, label, detail, contribution, evidenceIds: ids });
+  }
+  // Screening weights are additive points, not predicted commercial returns.
+  // Only apply audience proxies explicitly requested by the brief.
+  const nearby = evidence.filter(e => e.coordinates && e.grade === "verified" && e.entity !== "listing" && !e.mappedAsset)
+    .map(record => ({ record, km: haversineKm(point, record.coordinates!) }))
+    .filter(item => item.km <= 3).sort((a,b) => a.km - b.km);
+  const demographic = evidence.find(e => e.id.startsWith("demo-") && e.kind === "demographic" && e.coordinates?.lat === point.lat && e.coordinates?.lng === point.lng);
+  if (demographic) {
+    const profile = demographic.residentProfile;
+    const contribution = profile?.scope === "suburb" && /professional/i.test(request.prompt) ? 0.08 * profile.professionalShare : 0;
+    add("demographic", "Resident catchment", demographic.factualClaim + ". Resident composition is an audience proxy.", contribution, [demographic.id]);
+  }
+  const criteria: Array<[Factor["name"], boolean, number]> = [
+    ["school", /school|parent|famil|student/i.test(request.prompt), 0.15],
+    ["healthcare", /hospital|clinic|healthcare|patient/i.test(request.prompt), 0.15],
+    ["transit", /commut|transit|gautrain|station|public transport/i.test(request.prompt), 0.12],
+    ["fuel", request.vertical === "gas_station" && /competition|competing|competitor/.test(request.prompt.toLowerCase()), 0],
+    ["retail", /shop|retail|mall|restaurant/i.test(request.prompt), 0.12],
+    ["roads", industrial || billboard || request.vertical === "gas_station" || /access|traffic|road/i.test(request.prompt), 0.10],
+  ];
+  for (const [kind, relevant, weight] of criteria) {
+    if (!relevant) continue;
+    const nearest = nearby.find(item => item.record.kind === kind);
+    if (!nearest) continue;
+    if (industrial && nearest.record.mappedRoad?.hgv === "no") {
+      add("roads", "Heavy-vehicle restriction nearby", nearest.record.factualClaim + " · HGV access prohibited on this mapped road; check the entrance route.", 0, [nearest.record.id]);
+      continue;
+    }
+    if (kind === "fuel") {
+      add(kind, "Nearby fuel competitor", nearest.record.factualClaim + " · " + nearest.km.toFixed(2) + " km. Local trading volumes unknown.", 0, [nearest.record.id]);
+      continue;
+    }
+    add(kind, "Nearby " + kind, nearest.record.factualClaim + " · " + nearest.km.toFixed(2) + " km straight-line distance", weight * (1 - nearest.km / 3), [nearest.record.id]);
+  }
+  const freight = nearby.find(item => item.record.freightFacility);
+  if (industrial && freight) add("land", "Freight activity nearby", freight.record.factualClaim + " · " + freight.km.toFixed(2) + " km to mapped facility. A demand proxy; shipment volumes unverified.", 0.1 * (1 - freight.km / 3), [freight.record.id]);
+  const competitor = nearby.find(item => item.record.kind === "competitor");
+  if (industrial && competitor) add("competitor", "Existing warehouse", competitor.record.factualClaim + " · " + competitor.km.toFixed(2) + " km. Occupancy and available competing floor space unknown.", 0, [competitor.record.id]);
+
+  const corridor = findNearestHighway(point.lat, point.lng);
+  if (corridor && (industrial || billboard || request.vertical === "gas_station" || /traffic/i.test(request.prompt))) {
+    const { traffic, distanceKm } = corridor;
+    const share = industrial ? (traffic.heavyVehiclePct ?? 0) / 100 : 1;
+    const scale = industrial ? 15000 : 120000;
+    const contribution = 0.12 * Math.min(1, traffic.aadt * share / scale) * Math.max(0, 1 - distanceKm / 3);
+    add("traffic", "Corridor screening proxy", `${traffic.ref} · ${traffic.aadt.toLocaleString()} vehicles/day (${traffic.year}), ${distanceKm.toFixed(1)} km to count midpoint. ${traffic.heavyVehiclePct ?? "Unknown"}% heavy vehicles. Source: ${traffic.source}. Site frontage volumes unverified.`, contribution);
+  }
+  const metro = findMetroFor(point.lat, point.lng);
+  const zone = metro && findZoning(metro.metro, point.lat, point.lng);
+  if (zone) add("zoning", "Area zoning screen", zone.name + " · suburb-level geometry; confirm individual erf rights.", industrial && zone.category === "industrial" ? 0.12 : 0);
+  if (industrial) {
+    if (listing?.zoning && /industrial/i.test(listing.zoning)) add("zoning", "Advertised zoning", listing.zoning + " · seller statement", 0.12, evidence.filter(e => e.rawRecordId === listing.id).map(e => e.id));
+    blockers.push("Verify industrial rights, freight demand, entrance-to-highway truck route, yard turning space and bulk services.");
+  }
+  if (billboard) {
+    blockers.push("Confirm availability, advertising permission, orientation, sightline and audience composition.");
+    if (asset?.direction) add("traffic", "Mapped face direction", asset.direction, 0, [asset.id]);
+    const measured = asset?.faceSurvey;
+    if (measured) {
+      add("traffic", "Directional passing traffic", `${measured.vehiclesPerDay.toLocaleString()} vehicles/day for this face, surveyed ${measured.date}. Vehicle count, not impressions.`, 0.48 * (measured.vehiclesPerDay / (measured.vehiclesPerDay + 40000)), [asset!.id]);
+      if (measured.target && measured.targetShare !== undefined && request.prompt.toLowerCase().includes(measured.target.toLowerCase())) {
+        add("demographic", "Measured target audience share", measured.target + " · " + Math.round(100 * measured.targetShare) + "% in supplied survey", 0.25 * measured.vehiclesPerDay * measured.targetShare / (measured.vehiclesPerDay * measured.targetShare + 10000), [asset!.id]);
+      }
+    } else blockers.push("Directional traffic count and measured audience reach are unknown.");
+  }
+  if (listing) {
+    const checks = evidence.filter(e => e.rawRecordId === listing.id).map(e => e.id);
+    if (listing.landAreaSqm && /vacant|redevelop|plot|land/i.test(request.prompt)) add("land", "Advertised land", listing.landAreaSqm.toLocaleString() + " m²", 0, checks);
+  }
+  factors.sort((a,b) => b.contribution - a.contribution);
+  return { factors, blockers, zoning: zone?.name };
+}
diff --git a/package.json b/package.json
index ae4b347..ae6ec30 100644
--- a/package.json
+++ b/package.json
@@ -12,6 +12,7 @@
     "start": "next start",
     "lint": "next lint",
     "typecheck": "tsc --noEmit",
+    "test:site-ranking": "tsx scripts/site-ranking-check.ts",
     "test:reliability": "tsx scripts/reliability-check.ts",
     "test:research-v1": "tsx scripts/research-v1-check.ts",
     "test:listings-v1": "tsx scripts/listings-v1-check.ts",
diff --git a/scripts/research-v1-check.ts b/scripts/research-v1-check.ts
index ed847ae..e911282 100644
--- a/scripts/research-v1-check.ts
+++ b/scripts/research-v1-check.ts
@@ -29,7 +29,7 @@ try {
   const centurion = await parseResearchBrief({ vertical: "gas_station", prompt: "Identify a gas station development site near Centurion for a R20m budget." });
   assert.equal(centurion.vertical, "gas_station");
   const sources = await fetchSourceBundle({ ...sandton, geography: { ...sandton.geography, lat: -26.1, lng: 28.0 } }, 50);
-  assert.equal(sources.length, 8, "eight source adapters run in the fast bundle; live web research runs in its own phase");
+  assert.equal(sources.length, allAdapters.length, "each registered source has a diagnostic outcome");
   // Built-in municipal/traffic/demographic datasets answer without an API key,
   // so they may legitimately return "ok" here.
   assert.ok(sources.every((source) => source.status === "unavailable" || source.status === "error" || source.status === "timeout" || source.status === "empty" || (source.status === "ok" && ["sa_zoning", "sa_traffic", "stats_sa", "building_density"].includes(source.source))));
@@ -152,7 +152,7 @@ try {
     return minimaxResponse(noMatch);
   }) as typeof fetch;
   const explicitMinimax = await synthesizeResearch({ ...sandton, selectedModel: "minimax-m3" }, evidence, undefined, 45_000, undefined, [testCandidate]);
-  assert.equal(explicitMinimax.status, "no_verified_match");
+  assert.equal(explicitMinimax.status, "partial_result", "commentary cannot discard a screened candidate");
   assert.equal(explicitMinimaxBody.model, "MiniMax-M3", "explicit MiniMax must remain MiniMax");
   if (originalExplicitMiniMaxKey === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = originalExplicitMiniMaxKey;
 
@@ -164,7 +164,7 @@ try {
     return minimaxResponse(noMatch);
   }) as typeof fetch;
   const alternate = await synthesizeResearch({ ...sandton, selectedModel: "perplexity" }, evidence, undefined, 45_000, undefined, [testCandidate]);
-  assert.equal(alternate.status, "no_verified_match", JSON.stringify(alternate));
+  assert.equal(alternate.status, "partial_result", JSON.stringify(alternate));
   assert.equal(alternateUrl, "https://api.perplexity.ai/chat/completions");
   assert.equal(alternate.providerAttempts, undefined, "successful alternate synthesis does not emit a failure attempt");
 
@@ -337,8 +337,8 @@ try {
     }) as typeof fetch;
     allAdapters.forEach((adapter) => { adapter.enabled = () => true; adapter.fetch = async () => [{ name: "Source-backed place", sourceUrl: "https://example.com/place" }]; });
     const listingBudgetRun = await runResearchV1({ vertical: "restaurant", mode: "site-selection", prompt: "Find a restaurant site in Sandton." });
-    assert.equal(listingBudgetRun.listingSearch?.budget.cap, 9, "one provider call remains reserved for MiniMax");
-    assert.equal(listingBudgetRun.listingSearch?.budget.used, 9, "listings may consume their full non-synthesis budget");
+    assert.equal(listingBudgetRun.listingSearch?.budget.cap, RESEARCH_RUN_BUDGET.maxProviderCalls - allAdapters.length - 1, "one provider call remains reserved for MiniMax");
+    assert.equal(listingBudgetRun.listingSearch?.budget.used, RESEARCH_RUN_BUDGET.maxProviderCalls - allAdapters.length - 1, "listings may consume their full non-synthesis budget");
     assert.ok(listingBudgetRun.listingSearch?.sources.some((source) => source.status === "unavailable"), "remaining listing sources become unavailable without another call");
     assert.ok(listingBudgetRun.sourceLeads?.length, "completed listing searches remain available as source leads");
     assert.equal(listingBudgetRun.synthesis.status, "no_verified_match", `MiniMax synthesizes after listing budget exhaustion: ${listingBudgetRun.synthesis.error ?? "unknown"}`);
diff --git a/scripts/site-ranking-check.ts b/scripts/site-ranking-check.ts
new file mode 100644
index 0000000..b2b769c
--- /dev/null
+++ b/scripts/site-ranking-check.ts
@@ -0,0 +1,82 @@
+import assert from "node:assert/strict";
+import { runResearchV1 } from "../lib/research-run/run";
+import { buildCandidates } from "../lib/research-run/candidates";
+import { parseResearchBrief } from "../lib/research-run/brief";
+import { normalizeEvidence } from "../lib/research-run/evidence";
+import { faceInventory } from "../lib/research-run/face-inventory";
+import { detailPin } from "../lib/research-run/listings/detail-pin";
+import { evaluateListing } from "../lib/research-run/listings/match";
+import type { ListingCandidate } from "../lib/research-run/listings/types";
+
+async function main() {
+  const realFetch = globalThis.fetch;
+  const origin = {lat: -26.26, lng: 28.03};
+  const place = "Johannesburg South";
+  try {
+    globalThis.fetch = async (url) => {
+      assert.ok(decodeURIComponent(String(url)).replaceAll("+", " ").includes(place));
+      return Response.json([{ lat: String(origin.lat), lon: String(origin.lng), display_name: place + ", Gauteng", address: {country_code:"za"} }]);
+    };
+    const warehouse = await parseResearchBrief({vertical:"warehouse", prompt:"Identify 3–5 vacant or redevelopment sites within 10 km of Johannesburg South for a logistics-warehouse development; prioritize industrial zoning, truck access, freight demand, competing logistics supply, and servicing or entitlement constraints."});
+    assert.equal(warehouse.geography.lat, origin.lat);
+    assert.equal(warehouse.radiusKm, 10);
+    const listing = { id:"L1", title:"Industrial land", coordinates:origin, vertical:"industrial", location:"Aeroton" } as ListingCandidate;
+    assert.equal(evaluateListing(listing, warehouse).some(c => c.state === "fail" || c.key === "landArea"), false);
+    const now = Date.now();
+    const date = new Date(now - 86400000).toISOString().slice(0,10);
+    const faces = [5000,95000,15000].map((vehiclesPerDay,i) => ({...origin,name:"Face " + i,id:String(i),direction:"N",sourceUrl:"https://example.org/survey/" + i,survey:{date,vehiclesPerDay}}));
+    const records = faceInventory(JSON.stringify(faces),now);
+    const observations = normalizeEvidence([{source:"operator_faces",records,status:"ok",fetchedAt:date},{source:"overpass",status:"ok",fetchedAt:date,records:[
+      {...origin,tags:{name:"Community school",amenity:"school"}}, {...origin,tags:{amenity:"hospital",name:"Hospital"}},
+      {...origin,tags:{landuse:"brownfield"},sourceUrl:"https://www.openstreetmap.org/way/1"},
+      {lat:-25,lng:28,tags:{landuse:"brownfield"},sourceUrl:"https://www.openstreetmap.org/way/2"},
+    ]}]).evidence;
+    const brief = await parseResearchBrief({vertical:"retail_shop",prompt:"Rank the top 2 billboards within 10 km of Johannesburg South for parents near schools"});
+    const ranked = buildCandidates(brief,observations).candidates;
+    assert.deepEqual(ranked.map(c => c.id),["face-1","face-2"]);
+    assert.ok(ranked[0].suitability > ranked[1].suitability);
+    assert.ok(ranked[0].factors.some(f => f.name === "school" && f.contribution > 0));
+    assert.ok(!ranked[0].factors.some(f => f.name === "healthcare"));
+    const sites = buildCandidates(warehouse,observations).candidates;
+    assert.equal(sites.length,1);
+    assert.equal(sites[0].kind,"parcel");
+    assert.equal(sites[0].decision,"investigate");
+    assert.equal(buildCandidates(warehouse, observations.filter(e => !e.mappedAsset)).candidates.length,0);
+    const expired = faceInventory(JSON.stringify([{...faces[0],survey:{vehiclesPerDay:999999,date:"2000-01-01"}}]));
+    assert.equal(expired[0].faceSurvey,undefined);
+    const script = (type:string,lat:number) => '<script type="application/ld+json">'+JSON.stringify({"@type":type,geo:{latitude:lat,longitude:28}})+'</script>';
+    assert.equal(detailPin(script("RealEstateAgent",-26)),undefined);
+    assert.deepEqual(detailPin(script("House",-26)),{lat:-26,lng:28});
+    assert.equal(detailPin(script("House",-26)+script("House",-27)),undefined);
+    // Exercise the same discovery -> approved detail -> normalisation ->
+    // ranking -> synthesis pipeline used by POST /api/research.
+    const listingUrl = "https://property24.com/for-sale/aeroton/johannesburg/gauteng/3893/12345678";
+    const previousKey = process.env.TAVILY_API_KEY;
+    process.env.TAVILY_API_KEY = "test-only";
+    try {
+      globalThis.fetch = async (url, init) => {
+        const address = String(url);
+        if (address.includes("api.tavily.com/search")) {
+          const body = JSON.parse(String(init?.body));
+          return Response.json({results: body.include_domains?.includes("property24.com")
+            ? [{title:"Vacant industrial land for sale",url:listingUrl}] : []});
+        }
+        if (address === listingUrl) return new Response(script("Landform",origin.lat).replace('"longitude":28', '"longitude":' + origin.lng)
+          + " Vacant industrial land for sale. Address: Aeroton. R 1 500 000. 4 000 sqm land. Zoned industrial.");
+        if (address.includes("overpass")) return Response.json({elements:[]});
+        throw new Error("No external provider in regression");
+      };
+      const run = await runResearchV1({vertical:"warehouse", prompt:warehouse.prompt});
+      assert.equal(run.candidates?.length,1);
+      assert.equal(run.candidates?.[0].sourceUrl,listingUrl);
+      assert.equal(run.candidates?.[0].lat,origin.lat);
+      assert.equal(run.synthesis.options[0]?.optionId,run.candidates?.[0].id);
+      assert.ok(run.candidates?.[0].factors.some(f => f.name === "demographic"));
+    } finally {
+      if (previousKey === undefined) delete process.env.TAVILY_API_KEY;
+      else process.env.TAVILY_API_KEY = previousKey;
+    }
+    console.log("PASS warehouse geography, radius, asset identity, advertiser ranking, audience proxies, survey freshness, shortlist limit, listing pin extraction");
+  } finally { globalThis.fetch = realFetch; }
+}
+main().catch(error => { console.error(error); process.exitCode=1; });
````
<!-- ATLAS_PATCH_END -->
