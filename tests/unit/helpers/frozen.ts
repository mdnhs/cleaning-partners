import { execFileSync } from "node:child_process"

import { transformSync } from "esbuild"

/** The frozen baseline the inventory and the fixtures are verbatim copies of. */
export const BASELINE = "3689369"

/** A file of the static site at the baseline, via `git show` (survives Phase 3's file moves). */
export function frozenFile(path: string): string {
  return execFileSync("git", ["show", `${BASELINE}:${path}`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
}

/** The exports of a pure-data TypeScript module at the baseline (lib/services.ts, lib/blog-posts.ts). */
export function frozenModule<T>(path: string): T {
  const { code } = transformSync(frozenFile(path), {
    loader: "ts",
    format: "cjs",
  })
  const cjs = { exports: {} as Record<string, unknown> }
  new Function("module", "exports", code)(cjs, cjs.exports)
  return cjs.exports as T
}

/**
 * A top-level `const name = [ … ]` array literal of a component at the
 * baseline, evaluated (`scope` supplies the constants it references).
 */
export function frozenArray<T>(
  path: string,
  name: string,
  scope: Record<string, unknown> = {}
): T[] {
  const source = frozenFile(path)
  const match = source.match(
    new RegExp(
      `^const ${name}(?:: [^=]+)? = (\\[[^\\n]*\\]|\\[\\n[\\s\\S]*?\\n\\])$`,
      "m"
    )
  )
  if (!match) throw new Error(`No "const ${name} = [" in ${BASELINE}:${path}`)
  // The literal may carry TypeScript annotations (arrow function params).
  const { code } = transformSync(`exports.value = ${match[1]}`, {
    loader: "ts",
    format: "cjs",
  })
  const cjs = { value: [] as unknown[] }
  new Function("exports", ...Object.keys(scope), code)(
    cjs,
    ...Object.values(scope)
  )
  return cjs.value as T[]
}

/** A top-level `const name = "…"` string of a component at the baseline. */
export function frozenString(path: string, name: string): string {
  const match = frozenFile(path).match(
    new RegExp(`^const ${name} =\\s*("(?:[^"\\\\]|\\\\.)*")`, "m")
  )
  if (!match) throw new Error(`No "const ${name} =" in ${BASELINE}:${path}`)
  return JSON.parse(match[1]) as string
}
