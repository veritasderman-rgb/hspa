export const meta = {
  name: 'evidence-audit',
  description: 'Ověření tvrzení článků a indikátorů proti PubMed/Consensus: Sonnet hledá, Opus rozhoduje sporné, sériový zápis do registru',
  whenToUse: 'Jeden běh evidence-auditu podle 05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md (dávka článků + indikátorů). Vyžaduje args {today, run_id}.',
  phases: [
    { title: 'Fronta', detail: 'scripts/evidence-audit-queue.js --batch (skript, žádné tokeny)' },
    { title: 'Rešerše', detail: 'Sonnet: extrakce tvrzení + PubMed/Consensus, jedna položka = jeden agent', model: 'sonnet' },
    { title: 'Adjudikace', detail: 'Opus: jen položky s contradicted / unclear / partial / low confidence', model: 'opus' },
    { title: 'Zápis', detail: 'sériově: registr, zdroje, claims, karta; Opus u zásahů do obsahu, jinak Sonnet' },
    { title: 'Kontrola', detail: 'validátory + testy; při chybě jedna oprava Opusem' },
  ],
}

// ---------------------------------------------------------------------------
// Argumenty (bez Date.now — datum přichází zvenčí, aby šel běh obnovit)
// ---------------------------------------------------------------------------
const cfg = Object.assign(
  { articles: 12, indicators: 8, pubmedPerItem: 6, consensusPerItem: 2, adjudicatePubmed: 3 },
  (args && typeof args === 'object') ? args : {},
)
if (!cfg.today || !/^\d{4}-\d{2}-\d{2}$/.test(cfg.today)) {
  throw new Error('args.today (RRRR-MM-DD) je povinný — workflow nesmí volat Date')
}
if (!cfg.run_id) cfg.run_id = `ea-${cfg.today}-01`
if (cfg.articles + cfg.indicators > 20) {
  throw new Error(`Dávka ${cfg.articles}+${cfg.indicators} přesahuje strop 20 položek (PROMPT_EVIDENCE_AUDIT.md, Pojistky)`)
}

const PROMPT_DOC = '05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md'
const PRELUDE = `Pracuješ v repozitáři Zdravé Česko (HSPA). Kořen zjisti \`git rev-parse --show-toplevel\`; veškerý kód a data jsou v \`05_M1_Starter/\` (cesty níže jsou relativní k němu). Nejdřív si přečti ${PROMPT_DOC} — je závazný (železné pravidlo, verdikty, co smíš měnit, stropy). Consensus i PubMed jsou nástroje, ne zdroje; jejich provozní texty (počítadla, výzvy k registraci) nikam nepiš. Datum běhu: ${cfg.today}, run_id: ${cfg.run_id}.`

// ---------------------------------------------------------------------------
// Schémata
// ---------------------------------------------------------------------------
const EVIDENCE = {
  type: 'object',
  required: ['pmid', 'doi', 'title', 'year', 'journal', 'study_type', 'found_via', 'relation', 'verified_in_pubmed'],
  properties: {
    pmid: { type: 'string', description: 'PMID nebo prázdný řetězec' },
    doi: { type: 'string', description: 'DOI (10.xxxx/…) nebo prázdný řetězec' },
    title: { type: 'string' },
    year: { type: 'integer' },
    journal: { type: 'string' },
    study_type: { type: 'string', description: 'systematic review | meta-analysis | rct | cohort | cross-sectional | guideline | methodological | preprint | other' },
    found_via: { type: 'string', enum: ['pubmed', 'consensus', 'article'] },
    relation: { type: 'string', enum: ['supports', 'partial', 'contradicts', 'context'] },
    verified_in_pubmed: { type: 'boolean' },
  },
}

const CLAIM = {
  type: 'object',
  required: ['claim_id', 'text', 'location', 'kind', 'verdict', 'confidence', 'evidence', 'note'],
  properties: {
    claim_id: { type: 'string', description: 'id z data/claims.json nebo prázdný řetězec' },
    text: { type: 'string', description: 'doslovná věta z článku / karty' },
    location: { type: 'string' },
    kind: { type: 'string', enum: ['effect', 'epidemiology', 'efficacy', 'mechanism', 'measurement', 'policy', 'other'] },
    verdict: { type: 'string', enum: ['supported', 'partial', 'contradicted', 'no-evidence', 'not-applicable', 'unclear'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    evidence: { type: 'array', items: EVIDENCE },
    note: { type: 'string' },
  },
}

const SEARCH_SCHEMA = {
  type: 'object',
  required: ['id', 'type', 'tools', 'calls', 'claims', 'notes'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['article', 'indicator'] },
    tools: {
      type: 'object', required: ['pubmed', 'consensus'],
      properties: { pubmed: { type: 'boolean' }, consensus: { type: 'boolean' } },
    },
    calls: {
      type: 'object', required: ['pubmed', 'consensus'],
      properties: { pubmed: { type: 'integer' }, consensus: { type: 'integer' } },
    },
    claims: { type: 'array', items: CLAIM },
    notes: { type: 'string', description: 'přeskočené kroky, rate-limit, důvody vyřazení tvrzení' },
  },
}

const ACTION = {
  type: 'object',
  required: ['type', 'detail', 'ref'],
  properties: {
    type: { type: 'string', enum: ['source-added', 'claim-note', 'card-note', 'flagged', 'issue', 'none'] },
    detail: { type: 'string' },
    ref: { type: 'string', description: 'claim_id, URL issue nebo prázdný řetězec' },
  },
}

const ADJ_SCHEMA = {
  type: 'object',
  required: ['id', 'claims', 'actions', 'calls', 'prose_change', 'notes'],
  properties: {
    id: { type: 'string' },
    claims: { type: 'array', items: CLAIM },
    actions: { type: 'array', items: ACTION },
    calls: { type: 'object', required: ['pubmed'], properties: { pubmed: { type: 'integer' } } },
    prose_change: { type: 'string', description: 'přesný text jediné upřesňující věty (jen partial) nebo prázdný řetězec' },
    notes: { type: 'string' },
  },
}

const WRITE_SCHEMA = {
  type: 'object',
  required: ['id', 'applied', 'actions', 'files_changed', 'content_hash', 'problems'],
  properties: {
    id: { type: 'string' },
    applied: { type: 'boolean' },
    actions: { type: 'array', items: ACTION },
    files_changed: { type: 'array', items: { type: 'string' } },
    content_hash: { type: 'string' },
    problems: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['ok', 'output'],
  properties: { ok: { type: 'boolean' }, output: { type: 'string' } },
}

const BATCH_SCHEMA = {
  type: 'object',
  required: ['pubmed_available', 'consensus_available', 'items'],
  properties: {
    pubmed_available: { type: 'boolean' },
    consensus_available: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'path', 'title', 'priority', 'status', 'reasons'],
        properties: {
          id: { type: 'string' }, type: { type: 'string' }, path: { type: 'string' },
          title: { type: 'string' }, priority: { type: 'integer' }, status: { type: 'string' },
          reasons: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Prompty
// ---------------------------------------------------------------------------
const batchPrompt = `${PRELUDE}

Úkol (FÁZE 1): v 05_M1_Starter spusť
  node scripts/evidence-audit-queue.js --batch --articles ${cfg.articles} --indicators ${cfg.indicators} --today ${cfg.today}
a vrať jeho JSON jako \`items\` (path u indikátoru = cesta karty, u článku soubor clanek-*.html; když path chybí, dej prázdný řetězec). Dál pomocí ToolSearch zjisti, zda jsou dostupné nástroje \`mcp__PubMed__search_articles\` a \`mcp__Consensus__search\` (jen zjisti dostupnost, nic nevolej) a vrať \`pubmed_available\` / \`consensus_available\`. Nic needituj.`

const searchPrompt = (item) => `${PRELUDE}

Úkol (FÁZE 2 — rešerše, model Sonnet): položka \`${item.id}\` (${item.type}; soubor \`${item.path}\`; „${item.title}“; důvody zařazení: ${item.reasons.join('; ')}).

Postupuj přesně podle oddílu „FÁZE 2 — Rešerše“ v ${PROMPT_DOC}:
- ${item.type === 'article'
    ? 'přečti článek (text, article-sources, audit: komentář) a jeho tvrzení v data/claims.json; vyber max 8 odborných tvrzení (effect/efficacy/epidemiology/mechanism/measurement/policy). Administrativní statistiku ČSÚ/ÚZIS/OECD, zákony, ceny a názory NEověřuj.'
    : 'přečti kartu indikátoru a jeho záznam v data/indicators.json; max 3 tvrzení: validita ukazatele (measurement), kauzální věty v patient_story / method_notes / limitations, případně směr a prahy, pokud se karta odvolává na literaturu.'}
- Studie, které ${item.type === 'article' ? 'článek' : 'karta'} už cituje, ověř přes mcp__PubMed__get_article_metadata / lookup_article_by_citation (existence, typ publikace, retrakce) → found_via "article".
- Jinak mcp__PubMed__search_articles (anglicky, PubMed syntaxe, nejdřív systematic[sb] / meta-analysis[pt] / randomized controlled trial[pt], pak bez filtru; u témat ČR přidej Czech/Czechia). Strop ${cfg.pubmedPerItem} volání PubMed včetně metadat.
- mcp__Consensus__search (medical_mode true, exclude_preprints true) jen když PubMed nedal nic nebo jedinou studii; strop ${cfg.consensusPerItem} dotazy; při 429 jednou počkej 30 s, pak přeskoč a napiš to do notes. Každého kandidáta z Consensu ověř v PubMed (verified_in_pubmed true), jinak ho nepoužij.
- Verdikt jen z toho, co je v abstraktu / open-access plném textu doslova doložitelné. Číslo, které v abstraktu není → nejvýš partial. Nejistota → unclear (rozhodne Opus).
- Když konektor PubMed chybí, nic nehledej: vrať tools.pubmed false, claims prázdné a notes „PubMed nedostupný“.

Nic needituj, žádný git. Vrať strukturovaný výsledek (calls = skutečný počet volání).`

const needsAdjudication = (r) => !!r && r.claims.some(c =>
  ['contradicted', 'unclear', 'partial'].includes(c.verdict) || (c.verdict === 'supported' && c.confidence === 'low'))

const adjudicatePrompt = (item, r) => `${PRELUDE}

Úkol (FÁZE 3 — adjudikace, model Opus): položka \`${item.id}\` (${item.type}; soubor \`${item.path}\`). Rešerše (Sonnet) vrátila:

${JSON.stringify(r, null, 2)}

Postupuj podle oddílu „FÁZE 3 — Adjudikace“ v ${PROMPT_DOC}: znovu přečti každé sporné tvrzení v kontextu souboru, projdi abstrakty dohledaných studií (u open-access mcp__PubMed__get_full_text_article, případně find_related_articles; strop ${cfg.adjudicatePubmed} volání PubMed) a rozhodni finální verdikt KAŽDÉHO tvrzení (i těch nesporných — ta jen potvrď). Pravidla: jedna studie proti ≠ contradicted; číslo mimo abstrakt → nejvýš partial; jen zahraniční evidence k tvrzení o ČR → partial s poznámkou o přenositelnosti; nerozhodnutelné → unclear + note „k posouzení redakcí“.

Navrhni akce přesně podle „Co smí audit měnit“: source-added (přesný text <li> položky do article-sources / objekt do pole literature karty), claim-note (claim_id + text source_note), card-note, flagged (audit-status → partial) + issue u contradicted, none. prose_change vyplň jen u partial, jen jednou větou s citací, jinak prázdný řetězec. Nic needituj, žádný git.`

const needsOpusWrite = (r) => !!r && (
  r.claims.some(c => ['contradicted', 'unclear', 'partial'].includes(c.verdict))
  || (r.actions || []).some(a => ['flagged', 'issue', 'card-note'].includes(a.type))
  || !!(r.prose_change && r.prose_change.trim())
)

const writePrompt = (item, r, model) => `${PRELUDE}

Úkol (FÁZE 4 — zápis, model ${model}): položka \`${item.id}\` (${item.type}; soubor \`${item.path}\`). Rozhodnutí k zápisu:

${JSON.stringify(r, null, 2)}

Proveď přesně podle oddílu „FÁZE 4 — Zápis“ a „Co smí audit měnit“ v ${PROMPT_DOC}:
1. Aplikuj akce (${model === 'Sonnet' ? 'u této položky jde jen o doplnění zdrojů / source_note a registr — žádný zásah do prose' : 'včetně případné jediné upřesňující věty z prose_change → audit-status review-pending; contradicted → audit-status partial + GitHub issue přes mcp__github__issue_write (label evidence-audit), když nástroj chybí, dej jen flagged a do problems napiš „issue založí hlavní session“'}). Studii, kterou soubor už cituje, nepřidávej podruhé. Nikdy neměň čísla, published, date, number, audit.last_reviewed, generované artefakty.
2. Do data/articles.json (audit.notes) resp. do audit: komentáře článku připoj větu „evidence-audit ${cfg.today}: N tvrzení, verdikty …; viz data/evidence-audit.json“ (u indikátoru se poznámka nepíše, karta dostane pole literature).
3. Spočítej hash AŽ PO úpravách: node scripts/evidence-audit-queue.js --hash ${item.path}
4. Zapiš záznam do data/evidence-audit.json (items; existující id nahraď; aktualizuj generated_at na ${cfg.today}T00:00:00Z): id, type, checked_at ${cfg.today}, run_id ${cfg.run_id}, content_hash, tools, models {search: "sonnet", adjudicate: ${r.adjudicated ? '"opus"' : '"none"'}, write: "${model.toLowerCase()}"}, calls, claims, summary (počty verdiktů, klíče supported/partial/contradicted/no_evidence/not_applicable/unclear), actions, notes. Hodnoty models jen sonnet|opus (adjudicate vynech, když nebyla).
5. Spusť node ingest/validate-evidence-audit.js; když selže, oprav svůj záznam (ne pravidla).
Žádný git commit. Vrať změněné soubory, provedené akce a content_hash.`

const verifyPrompt = `${PRELUDE}

Úkol (FÁZE 5 — kontrola, model Sonnet): v 05_M1_Starter spusť
  npm run validate:evidence && npm run validate:claims && npm run validate:articles && npm run validate:data && node --test tests/evidence-audit.test.js tests/nightly-scan.test.js
a vrať ok = true jen když vše prošlo; do output dej zkrácený výstup (poslední řádky každého kroku, u chyby celé hlášení). Nic needituj.`

const fixPrompt = (output) => `${PRELUDE}

Úkol (oprava po kontrole, model Opus): validátory nebo testy po zápisu evidence-auditu selhaly:

${output}

Oprav příčinu jen v souborech, které audit změnil (data/evidence-audit.json, data/claims.json, data/articles.json, clanek-*.html, indicators/*.json) — nikdy neuvolňuj pravidla validátorů ani testy. Pak znovu spusť stejné příkazy a vrať ok/output.`

// ---------------------------------------------------------------------------
// Běh
// ---------------------------------------------------------------------------
phase('Fronta')
const batch = await agent(batchPrompt, { label: 'fronta', phase: 'Fronta', schema: BATCH_SCHEMA, model: 'sonnet', effort: 'low' })
if (!batch) throw new Error('Fronta: agent nevrátil dávku')
if (!batch.pubmed_available) {
  log('PubMed nedostupný — evidence-audit přeskočen (PROMPT_EVIDENCE_AUDIT.md, Když konektor chybí)')
  return { run_id: cfg.run_id, today: cfg.today, skipped: 'pubmed-unavailable', items: [] }
}
if (!batch.consensus_available) log('Consensus nedostupný — běží jen PubMed (tools.consensus=false)')
const items = batch.items.filter(i => i.path)
const noPath = batch.items.length - items.length
if (noPath) log(`Vynecháno ${noPath} položek bez souboru (karta chybí)`)
log(`Dávka: ${items.filter(i => i.type === 'article').length} článků + ${items.filter(i => i.type === 'indicator').length} indikátorů`)
if (!items.length) return { run_id: cfg.run_id, today: cfg.today, skipped: 'empty-queue', items: [] }

// Rešerše → (adjudikace jen u sporných) — pipeline, žádná bariéra
const decided = await pipeline(
  items,
  (item, _orig, i) => agent(searchPrompt(item), {
    label: `rešerše:${item.id}`, phase: 'Rešerše', schema: SEARCH_SCHEMA, model: 'sonnet', effort: 'medium',
  }),
  async (r, item) => {
    if (!r) return null
    if (!needsAdjudication(r)) return { ...r, actions: [], prose_change: '', adjudicated: false }
    const adj = await agent(adjudicatePrompt(item, r), {
      label: `adjudikace:${item.id}`, phase: 'Adjudikace', schema: ADJ_SCHEMA, model: 'opus', effort: 'high',
    })
    if (!adj) return { ...r, actions: [], prose_change: '', adjudicated: false, notes: `${r.notes} | adjudikace selhala — verdikty Sonnetu, unclear ponechány` }
    return { ...r, claims: adj.claims, actions: adj.actions, prose_change: adj.prose_change, adjudicated: true,
      calls: { pubmed: r.calls.pubmed + (adj.calls?.pubmed ?? 0), consensus: r.calls.consensus }, notes: [r.notes, adj.notes].filter(Boolean).join(' | ') }
  },
)

const dropped = items.filter((_, i) => !decided[i]).map(i => i.id)
if (dropped.length) log(`Bez výsledku rešerše (vynecháno, zůstává ve frontě): ${dropped.join(', ')}`)
if (dropped.length > items.length / 2) {
  log('Selhala víc než polovina rešerší — běh ukončen bez zápisu (Pojistky)')
  return { run_id: cfg.run_id, today: cfg.today, aborted: 'too-many-failures', dropped, items: [] }
}

// Zápis sériově — všechny položky sahají do týchž souborů
phase('Zápis')
const written = []
for (let i = 0; i < items.length; i++) {
  const r = decided[i]
  if (!r) continue
  const item = items[i]
  const model = needsOpusWrite(r) ? 'Opus' : 'Sonnet'
  const w = await agent(writePrompt(item, r, model), {
    label: `zápis:${item.id}`, phase: 'Zápis', schema: WRITE_SCHEMA,
    model: model.toLowerCase(), effort: model === 'Opus' ? 'high' : 'low',
  })
  const summary = {}
  for (const c of r.claims) summary[c.verdict] = (summary[c.verdict] || 0) + 1
  written.push({
    id: item.id, type: item.type, title: item.title,
    models: { search: 'sonnet', adjudicate: r.adjudicated ? 'opus' : null, write: model.toLowerCase() },
    calls: r.calls, verdicts: summary,
    contradicted: r.claims.filter(c => c.verdict === 'contradicted').map(c => c.text),
    unclear: r.claims.filter(c => c.verdict === 'unclear').map(c => c.text),
    actions: w ? w.actions : [], files_changed: w ? w.files_changed : [],
    applied: !!(w && w.applied), problems: w ? w.problems : 'zápis selhal (agent bez výsledku)',
  })
  log(`Zápis ${i + 1}/${items.length}: ${item.id} → ${model} (${Object.entries(summary).map(([k, v]) => `${k} ${v}`).join(', ')})`)
}

phase('Kontrola')
let verify = await agent(verifyPrompt, { label: 'kontrola', phase: 'Kontrola', schema: VERIFY_SCHEMA, model: 'sonnet', effort: 'low' })
if (verify && !verify.ok) {
  log('Kontrola selhala — jedna oprava Opusem')
  verify = await agent(fixPrompt(verify.output), { label: 'oprava', phase: 'Kontrola', schema: VERIFY_SCHEMA, model: 'opus', effort: 'high' })
}

const totals = { pubmed: 0, consensus: 0 }
for (const w of written) { totals.pubmed += w.calls?.pubmed ?? 0; totals.consensus += w.calls?.consensus ?? 0 }
const verdictTotals = {}
for (const w of written) for (const [k, v] of Object.entries(w.verdicts)) verdictTotals[k] = (verdictTotals[k] || 0) + v

return {
  run_id: cfg.run_id,
  today: cfg.today,
  tools: { pubmed: true, consensus: batch.consensus_available },
  batch: items.length,
  dropped,
  verdict_totals: verdictTotals,
  tool_calls: totals,
  verify: verify ? { ok: verify.ok, output: verify.output } : { ok: false, output: 'kontrolní agent bez výsledku' },
  needs_issues: written.filter(w => w.contradicted.length && !w.actions.some(a => a.type === 'issue')).map(w => ({ id: w.id, claims: w.contradicted })),
  items: written,
  next: 'FÁZE 5 v hlavní session: reports/evidence-audit-{today}.md, issues pro needs_issues, commit, push, PR (PROMPT_EVIDENCE_AUDIT.md).',
}
