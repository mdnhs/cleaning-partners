import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

type Entry = {
  id: string
  source: string
  kind: string
  value: string
  target: string
  pages: string[]
  template?: unknown
  derived?: unknown
  seed?: unknown
  note?: unknown
  array?: string
}

// Sources are read from this commit, not the working tree, so the validator
// survives Phase 3.4 moving/rewriting the components.
const BASELINE = "3689369"
const sourceCache = new Map<string, string>()
const baselineSource = (file: string) => {
  let text = sourceCache.get(file)
  if (text === undefined) {
    text = execFileSync("git", ["show", `${BASELINE}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    })
    sourceCache.set(file, text)
  }
  return text
}

const KINDS = new Set([
  "text",
  "richText",
  "image",
  "alt",
  "href",
  "tel",
  "mailto",
  "list",
  "aria",
  "meta",
])
const ROOTS = [
  /^pages\.(home|about|services|blog|contact|privacy|terms)\./,
  /^services\[[a-z0-9-]*\]\./,
  /^articles\[[a-z0-9-]*\]\./,
  /^(team|clients|groupCompanies|categories|testimonials)\[\]\./,
  /^settings\.(site|contact|navigation|footer|sections\.clients|sections\.whyChooseUs|sections\.contact|sections\.map|sections\.team|sections\.testimonials|sections\.howItWorks|seo\.defaults|consent|tracking|customCode|microcopy|leads)\./,
]

const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&nbsp;": " ",
}
const collapse = (s: string) => s.replace(/\s+/g, " ")
const normSource = (s: string) =>
  collapse(
    s
      .replace(
        /&(apos|quot|amp|rsquo|lsquo|ldquo|rdquo|nbsp);/g,
        (m) => ENTITIES[m]
      )
      .replace(/\\(["'`])/g, "$1")
      .replace(/ /g, " ")
  )
const normValue = (s: string) => collapse(s.replace(/ /g, " "))

const raw = JSON.parse(
  readFileSync(
    process.env.INVENTORY_FILE ?? "docs/brief-inventory.json",
    "utf8"
  )
) as {
  version: number
  entries: Entry[]
}
const errors: string[] = []
if (raw.version !== 1) errors.push("version must be 1")
const ids = new Set<string>()
for (const e of raw.entries) {
  if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`)
  ids.add(e.id)
  if (!KINDS.has(e.kind)) errors.push(`${e.id}: bad kind ${e.kind}`)
  if (!ROOTS.some((r) => r.test(e.target)))
    errors.push(`${e.id}: bad target ${e.target}`)
  if (!/^(app|components|lib)\/.+:\d+$/.test(e.source)) {
    errors.push(`${e.id}: bad source ${e.source}`)
    continue
  }
  const [file, line] = e.source.split(":")
  let text: string
  try {
    text = baselineSource(file)
  } catch {
    errors.push(`${e.id}: ${file} not found at ${BASELINE}`)
    continue
  }
  const lines = text.split("\n")
  if (Number(line) < 1 || Number(line) > lines.length)
    errors.push(`${e.id}: line out of range`)
  if (!Array.isArray(e.pages) || e.pages.length === 0)
    errors.push(`${e.id}: pages empty`)
  if (e.template !== undefined && typeof e.template !== "boolean")
    errors.push(`${e.id}: template must be boolean`)
  if (e.derived !== undefined && typeof e.derived !== "boolean")
    errors.push(`${e.id}: derived must be boolean`)
  if (e.template === true && e.derived === true)
    errors.push(`${e.id}: template and derived are mutually exclusive`)
  // seed = SP interpolate syntax ({identifier}); never verbatim-checked.
  if (e.template === true) {
    if (typeof e.seed !== "string" || e.seed === "")
      errors.push(`${e.id}: template entry needs a "seed" string`)
  } else if (e.seed !== undefined) {
    errors.push(`${e.id}: seed only allowed on template entries`)
  }
  if (typeof e.seed === "string") {
    const rest = e.seed.replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, "")
    if (e.seed.includes("$") || /[{}]/.test(rest))
      errors.push(
        `${e.id}: seed must use only {identifier} placeholders (no \${…}): ${e.seed}`
      )
  }
  // Stale line numbers fail: value (or array declaration) must be in a
  // window of lines (line-1 .. line+8) around the stated source line.
  const windowText = lines
    .slice(Math.max(0, Number(line) - 2), Number(line) + 8)
    .join("\n")
  if (e.kind === "list") {
    if (!e.array) errors.push(`${e.id}: list entry needs "array" identifier`)
    else {
      const id = e.array.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const decl = new RegExp(`\\b${id}\\s*[:=]|const\\s+${id}\\b`)
      if (!decl.test(windowText))
        errors.push(`${e.id}: array ${e.array} not declared near ${e.source}`)
    }
  } else if (!normSource(windowText).includes(normValue(e.value))) {
    errors.push(`${e.id}: value not found verbatim near ${e.source}`)
  }
}
// A value with {…} placeholders is either a template field (template: true,
// seeded verbatim, interpolated at render) or a derived usage whose source
// value is another entry with the same target and no placeholders.
for (const e of raw.entries) {
  if (!e.value.includes("{") || e.template === true) continue
  const hasSource = raw.entries.some(
    (o) => o !== e && o.target === e.target && !o.value.includes("{")
  )
  if (!hasSource)
    errors.push(
      `${e.id}: placeholder value without template: true and no source entry for ${e.target}`
    )
}
// A derived entry is a usage computed from another field. It needs a
// non-derived source entry for its target, or a note saying where it comes from.
const isLiteral = (o: Entry) =>
  o.derived !== true &&
  o.template !== true &&
  o.kind !== "list" &&
  !o.value.includes("{")
for (const e of raw.entries) {
  if (e.derived !== true) continue
  const hasSource = raw.entries.some(
    (o) => o !== e && o.target === e.target && isLiteral(o)
  )
  if (!hasSource && typeof e.note !== "string")
    errors.push(
      `${e.id}: derived entry has no source entry for ${e.target} and no note`
    )
}
// Single source: literal (non-derived, non-template, non-binding) entries that
// share a target must carry the same value.
const byTarget = new Map<string, Entry[]>()
for (const e of raw.entries)
  if (isLiteral(e))
    byTarget.set(e.target, [...(byTarget.get(e.target) ?? []), e])
for (const [target, group] of byTarget) {
  const first = normValue(group[0].value)
  for (const o of group.slice(1))
    if (normValue(o.value) !== first)
      errors.push(
        `${o.id}: value differs from ${group[0].id} for shared target ${target} (mark one derived/template or split the target)`
      )
}
if (raw.entries.length < 200)
  errors.push(`only ${raw.entries.length} entries — inventory incomplete`)
if (errors.length) {
  console.error(errors.join("\n"))
  process.exit(1)
}
console.log(`inventory ok: ${raw.entries.length} entries`)
