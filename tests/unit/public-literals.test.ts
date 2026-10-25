import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

// O6: nothing the public site shows is hard-coded in a component. Every
// user-visible string is a template field, a setting or a collection row and
// reaches the component as a prop. This test parses every public component
// and fails on
//   - JSX text,
//   - a string or template literal as the value of an `alt`, `aria-label`,
//     `title`, `placeholder`, `href`, `src`, `action`, `value`, `content`,
//     `eyebrow`, `description`, `label` or `crumb` prop,
//   - a string or template literal rendered from a JSX child expression,
//     directly or inside `&&`, `||`, `??` and `?:`,
//   - a module-level string const, and a module-level array or object with
//     a word in any string leaf (the shape of the data arrays this task
//     removed: `const socials = [{ label: "Facebook", href: "#" }]`).
// ALLOWLIST (the only literals a public component may contain):
//   - JSX text of separators and glyphs only: `·`, `/`, `*`, `“`, `→` and
//     the `&nbsp;` entity (aria-hidden separators between items, the
//     required marker, the decorative quote, the hover arrow, the gap);
//   - the empty string (`alt=""` marks a decorative image);
//   - `data-*` attribute values (CSS-only hooks the motion code reads);
//   - module-level consts whose name ends in `Class` or `_CLASS` (Tailwind
//     class lists, not copy);
//   - the technical constants in TECHNICAL_CONSTS below (a URL and a media
//     query: neither is shown to anyone).

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
  "action",
  "value",
  "content",
  // Props that carry copy between components.
  "eyebrow",
  "description",
  "label",
  "crumb",
])
const TECHNICAL_CONSTS: Record<string, string[]> = {
  "components/home/logo-animation.tsx": ["LOTTIE_WASM_URL", "REDUCE_MOTION"],
}
/** Separators and glyphs with no words (after removing &nbsp;). */
const GLYPHS = /^[\s\u00a0·/*“→]*$/
/** A string that contains a word (a letter or digit). */
const hasWord = (text: string) => /[\p{L}\p{N}]/u.test(text)
const CLASS_NAME = /(Class|_CLASS)$/

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

const unwrap = (node: ts.Expression): ts.Expression => {
  let n = node
  while (
    ts.isAsExpression(n) ||
    ts.isSatisfiesExpression(n) ||
    ts.isParenthesizedExpression(n) ||
    ts.isNonNullExpression(n)
  )
    n = n.expression
  return n
}

/** Text of the literal parts of a template expression. */
const templateText = (t: ts.TemplateExpression) =>
  t.head.text + t.templateSpans.map((span) => span.literal.text).join("")

/** Every string leaf (string literal or template parts) inside a data literal. */
function stringLeaves(node: ts.Node, out: string[] = []): string[] {
  if (isStringLike(node)) out.push(node.text)
  else if (ts.isTemplateExpression(node)) out.push(templateText(node))
  else if (ts.isPropertyAssignment(node)) stringLeaves(node.initializer, out)
  else if (ts.isArrayLiteralExpression(node))
    node.elements.forEach((el) => stringLeaves(el, out))
  else if (ts.isObjectLiteralExpression(node))
    node.properties.forEach((p) => stringLeaves(p, out))
  else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))
    stringLeaves(node.expression, out)
  return out
}

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

  /** Literals a JSX child expression can render: through &&, ||, ??, ?: and parentheses. */
  const checkChild = (expr: ts.Expression) => {
    const e = unwrap(expr)
    if (isStringLike(e)) {
      if (!GLYPHS.test(e.text)) at(e, `string child ${e.getText(sf)}`)
    } else if (ts.isTemplateExpression(e)) {
      if (hasWord(templateText(e))) at(e, `template child ${e.getText(sf)}`)
    } else if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        checkChild(e.left)
        checkChild(e.right)
      }
    } else if (ts.isConditionalExpression(e)) {
      checkChild(e.whenTrue)
      checkChild(e.whenFalse)
    }
  }

  const technical = TECHNICAL_CONSTS[file] ?? []
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/&nbsp;/g, "")
      if (!GLYPHS.test(text))
        at(node, `JSX text ${JSON.stringify(node.getText(sf).trim())}`)
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf)
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression && unwrap(node.initializer.expression)
        : node.initializer
      if (
        CHECKED_PROPS.has(name) &&
        value &&
        (isStringLike(value) || ts.isTemplateExpression(value)) &&
        !(isStringLike(value) && value.text === "")
      )
        at(node, `${name}=${node.initializer.getText(sf)}`)
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      checkChild(node.expression)
    } else if (ts.isVariableStatement(node) && node.parent === sf) {
      for (const d of node.declarationList.declarations) {
        const name = d.name.getText(sf)
        if (!d.initializer || CLASS_NAME.test(name) || technical.includes(name))
          continue
        const init = unwrap(d.initializer)
        if (isStringLike(init) || ts.isTemplateExpression(init)) {
          const text = isStringLike(init) ? init.text : templateText(init)
          if (hasWord(text)) at(d, `module-level string ${name}`)
        } else if (
          ts.isArrayLiteralExpression(init) ||
          ts.isObjectLiteralExpression(init)
        ) {
          if (stringLeaves(init).some(hasWord))
            at(d, `module-level data literal ${name}`)
        }
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
    const hits = (body: string) => findLiterals(body)

    it("flags JSX text, checked props and string children", () => {
      expect(
        hits(`
        export function X() {
          return (
            <div>
              Hello
              <img src="/x.png" alt="A cat" />
              <a href={"/y"} aria-label={\`z\`} title="t">{"text"}</a>
              <input placeholder="Search" />
            </div>
          )
        }`)
      ).toEqual([
        '5: JSX text "Hello"',
        '6: src="/x.png"',
        '6: alt="A cat"',
        '7: href={"/y"}',
        "7: aria-label={`z`}",
        '7: title="t"',
        '7: string child "text"',
        '8: placeholder="Search"',
      ])
    })

    it("flags the props action, value and content", () => {
      expect(
        hits(`export const X = () => (
          <form action="/blog"><option value="Other" /><meta content="x" /></form>
        )`)
      ).toEqual(
        ['1: action="/blog"', '1: value="Other"', '1: content="x"'].map((m) =>
          m.replace("1:", "2:")
        )
      )
    })

    it("flags module-level string consts, but not class-name consts", () => {
      expect(
        hits(`const EMAIL = "info@example.ie"
const ALL = "All Posts"
const pillBaseClass = "flex items-center"
const BASE_CLASS = "rounded-full"
const TILE = 256`)
      ).toEqual(["1: module-level string EMAIL", "2: module-level string ALL"])
    })

    it("flags module-level arrays and objects with words in their leaves", () => {
      expect(
        hits(`const names = ["a", "b"]
const socials = [{ label: "Facebook", href: "#" }]
const nested = { a: { b: ["x"] } } as const
const tiles: [number, number][] = [[2, 0], [3, 1]]
const punctuation = ["·", "/"]`)
      ).toEqual([
        "1: module-level data literal names",
        "2: module-level data literal socials",
        "3: module-level data literal nested",
      ])
    })

    it("flags strings inside && and ?: child expressions", () => {
      expect(
        hits(`export function X({ a }: { a: boolean }) {
          return (
            <p>
              {a && "Shown"}
              {a ? "Yes" : "No"}
              {a && (a ? "Deep" : null)}
              {a || "Fallback"}
            </p>
          )
        }`)
      ).toEqual([
        '4: string child "Shown"',
        '5: string child "Yes"',
        '5: string child "No"',
        '6: string child "Deep"',
        '7: string child "Fallback"',
      ])
    })

    it("flags template-literal children", () => {
      expect(
        hits(`const EMAIL_ADDRESS = (): string => "x"
export function X({ sent, email }: { sent: boolean; email: string }) {
          return (
            <p>
              {sent && \`Your email app should open. Write to \${email}.\`}
              {\`Hello \${email}\`}
              {\`\${email}\`}
            </p>
          )
        }`)
      ).toEqual([
        "5: template child `Your email app should open. Write to ${email}.`",
        "6: template child `Hello ${email}`",
      ])
    })

    it("allows glyphs, empty alt, data-* values, props and class consts", () => {
      expect(
        hits(`const pillClass = "flex gap-2"
const tiles = [[1, 2]]
export function X({ t, href, a }: { t: string; href: string; a: boolean }) {
          return (
            <p data-reveal="a" className="text-lg">
              <a href={href}>{t}</a>
              <span aria-hidden>·</span>
              <span aria-hidden>/</span>
              <span aria-hidden>*</span>
              <span aria-hidden>“</span>
              <span aria-hidden>→</span>
              &nbsp;&nbsp;
              <img src={t} alt="" />
              {a && t}
              {a ? t : null}
              {a && "·"}
            </p>
          )
        }`)
      ).toEqual([])
    })

    it("only exempts the technical consts of the file that lists them", () => {
      const source = 'export const LOTTIE_WASM_URL = "/vendor/x.wasm"'
      expect(
        findLiterals(source, "components/home/logo-animation.tsx")
      ).toEqual([])
      expect(findLiterals(source, "components/home/other.tsx")).toEqual([
        "1: module-level string LOTTIE_WASM_URL",
      ])
    })
  })
})
