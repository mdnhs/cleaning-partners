import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

// O6: nothing the public site shows is hard-coded in a component. Every
// user-visible string is a template field, a setting or a collection row and
// reaches the component as a prop. This test parses every public component
// and fails on
//   - JSX text,
//   - a string literal (or a template literal) as the value of an `alt`,
//     `aria-label`, `title`, `placeholder`, `href` or `src` prop,
//   - a string literal rendered straight from a JSX expression, and
//   - a module-level array of strings.
// ALLOWLIST (the only literals a public component may contain):
//   - punctuation and separators: · | — – / * “ ” ← → ↑ ↓ and HTML entities
//     such as &nbsp; (decorative glyphs and the aria-hidden separators
//     between items);
//   - the empty string (`alt=""` marks a decorative image);
//   - `data-*` attribute values (CSS-only hooks the motion code reads).

const PUBLIC_DIRS = [
  "components/home",
  "components/about",
  "components/services",
  "components/blog",
  "components/contact",
  "templates",
]
const CHECKED_PROPS = new Set([
  "alt",
  "aria-label",
  "title",
  "placeholder",
  "href",
  "src",
  // Props that carry copy between components.
  "eyebrow",
  "description",
  "label",
  "crumb",
])
/** Punctuation, separators and glyphs: no words. */
const PUNCTUATION = /^[\s ·|—–/*“”←→↑↓.,:;!?()[\]-]*$/

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path)
    return /\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [path]
      : []
  })
}

const isStringLike = (node: ts.Node): node is ts.StringLiteralLike =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)

/** Every hard-coded literal in `source`, as "line: what". */
export function findLiterals(source: string, file = "file.tsx"): string[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const found: string[] = []
  const at = (node: ts.Node, what: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    found.push(`${line + 1}: ${what}`)
  }
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf)
      // &nbsp; and the other entities are separators, never words.
      if (!PUNCTUATION.test(text.replace(/&#?\w+;/g, "")))
        at(node, `JSX text ${JSON.stringify(text.trim())}`)
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf)
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer
      if (
        CHECKED_PROPS.has(name) &&
        value &&
        (isStringLike(value) || ts.isTemplateExpression(value)) &&
        !(isStringLike(value) && value.text === "")
      )
        at(node, `${name}=${node.initializer.getText(sf)}`)
    } else if (ts.isJsxExpression(node) && node.expression) {
      const inChild =
        ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)
      const e = node.expression
      if (inChild && isStringLike(e) && !PUNCTUATION.test(e.text))
        at(node, `string child ${e.getText(sf)}`)
    } else if (ts.isVariableStatement(node) && node.parent === sf) {
      for (const d of node.declarationList.declarations) {
        let init = d.initializer
        while (
          init &&
          (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))
        )
          init = init.expression
        if (
          init &&
          ts.isArrayLiteralExpression(init) &&
          init.elements.some((el) => isStringLike(el))
        )
          at(d, `module-level string array ${d.name.getText(sf)}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe("public components contain no hard-coded copy (O6)", () => {
  const all = PUBLIC_DIRS.flatMap(files)

  it("scans the public components and template renders", () => {
    expect(all.length).toBeGreaterThan(25)
    expect(all).toContain("components/home/site-header.tsx")
    expect(all).toContain("components/blog/blog-list.tsx")
    expect(all).toContain("templates/home/render.tsx")
  })

  it.each(all)("%s", (file) => {
    expect(findLiterals(readFileSync(file, "utf8"), file)).toEqual([])
  })

  describe("the scanner itself", () => {
    it("flags text, checked props, string children and string arrays", () => {
      const source = `
        const names = ["a", "b"]
        export function X({ t }: { t: string }) {
          return (
            <div>
              Hello
              <img src="/x.png" alt="A cat" />
              <a href={"/y"} aria-label={\`z\`} title="t">{"text"}</a>
              <input placeholder="Search" />
            </div>
          )
        }`
      expect(findLiterals(source)).toEqual([
        "2: module-level string array names",
        '6: JSX text "Hello"',
        '7: src="/x.png"',
        '7: alt="A cat"',
        '8: href={"/y"}',
        "8: aria-label={`z`}",
        '8: title="t"',
        '8: string child "text"',
        '9: placeholder="Search"',
      ])
    })

    it("allows punctuation, separators, empty alt, data-* values and props", () => {
      const source = `
        export function X({ t, href }: { t: string; href: string }) {
          return (
            <p data-reveal="a" className="text-lg">
              <a href={href}>{t}</a>
              <span aria-hidden>·</span>
              <span aria-hidden>/</span>
              &nbsp;&nbsp;—&nbsp;
              <img src={t} alt="" />
            </p>
          )
        }`
      expect(findLiterals(source)).toEqual([])
    })
  })
})
