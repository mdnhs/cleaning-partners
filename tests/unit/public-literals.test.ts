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
//   - a function-local word-bearing string const (or array/object literal)
//     that reaches a JSX child or a checked prop, directly or through `&&`,
//     `||`, `??`, `?:` and `.map(...)`,
//   - a string inside a ternary or logical expression in a checked prop,
//   - an array literal child, or the receiver of a call in a child:
//     `{["One", "Two"].map(...)}`,
//   - a module-level string const, and a module-level array or object with
//     a word in any string leaf (the shape of the data arrays this task
//     removed: `const socials = [{ label: "Facebook", href: "#" }]`).
// ALLOWLIST (the only literals a public component may contain):
//   - JSX text of separators and glyphs only: `·`, `/`, `*`, `“`, `”`, `—`, `→`
//     and the `&nbsp;`, `&ldquo;` and `&rdquo;` entities (aria-hidden separators between items, the
//     required marker, the decorative quote, the hover arrow, the gap);
//   - the empty string (`alt=""` marks a decorative image);
//   - `data-*` attribute values (CSS-only hooks the motion code reads);
//   - module-level consts whose name ends in `Class` or `_CLASS` AND whose
//     every string leaf is Tailwind-like (see isClassList): a sentence under
//     a `*Class` name is still copy;
//   - the technical constants in TECHNICAL_CONSTS below (a URL and a media
//     query: neither is shown to anyone).

const PUBLIC_DIRS = [
  "components/home",
  "components/about",
  "components/services",
  "components/blog",
  "components/contact",
  "templates",
  "lib/rich-text",
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
const GLYPHS = /^[\s\u00a0·/*“”—→]*$/
/** A string that contains a word (a letter or digit). */
const hasWord = (text: string) => /[\p{L}\p{N}]/u.test(text)
const CLASS_NAME = /(Class|_CLASS)$/
/** Bare Tailwind utilities (no `-`, `:`, `[`, digit or `/` to tell them from words). */
const BARE_UTILITIES = new Set(
  `absolute antialiased block border capitalize collapse contents fixed flex
flow-root grid grow hidden inline inline-block inline-flex invisible italic
lowercase overflow-hidden relative resize ring rounded shadow shrink static
sticky transition truncate underline uppercase visible container sr-only
outline blur filter transform table`.split(/\s+/)
)
/** A whitespace token that looks like a Tailwind class. */
const isClassToken = (token: string) =>
  BARE_UTILITIES.has(token) || /[-:[\]/%!\d_()=.#&>*]/.test(token)
/** Every whitespace token is class-like: no plain words, so no sentence. */
const isClassList = (text: string) =>
  text.split(/\s+/).filter(Boolean).every(isClassToken)

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

/** Wrapper calls that return their argument unchanged. */
const WRAPPERS = new Set(["Object.freeze", "Object.seal"])

const unwrap = (node: ts.Expression): ts.Expression => {
  let n = node
  for (;;) {
    if (
      ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isNonNullExpression(n)
    )
      n = n.expression
    else if (
      ts.isCallExpression(n) &&
      n.arguments.length === 1 &&
      WRAPPERS.has(n.expression.getText())
    )
      n = n.arguments[0]
    else return n
  }
}

/** Text of the literal parts of a template expression. */
const templateText = (t: ts.TemplateExpression) =>
  t.head.text + t.templateSpans.map((span) => span.literal.text).join("")

/** Every string leaf (string literal or template parts) inside a data literal. */
function stringLeaves(node: ts.Node, out: string[] = []): string[] {
  if (isStringLike(node)) out.push(node.text)
  else if (ts.isTemplateExpression(node)) out.push(templateText(node))
  else if (ts.isPropertyAssignment(node))
    stringLeaves(unwrap(node.initializer), out)
  else if (ts.isArrayLiteralExpression(node))
    node.elements.forEach((el) => stringLeaves(unwrap(el), out))
  else if (ts.isObjectLiteralExpression(node))
    node.properties.forEach((p) => stringLeaves(p, out))
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

  /** Names a binding (parameter or declaration) introduces. */
  const bindingNames = (name: ts.BindingName, out: string[] = []) => {
    if (ts.isIdentifier(name)) out.push(name.text)
    else
      name.elements.forEach((el) => {
        if (ts.isBindingElement(el)) bindingNames(el.name, out)
      })
    return out
  }

  /**
   * The initializer of the nearest enclosing function-local `const <name> =`
   * (module level is checked at the declaration). null when the name is a
   * parameter, a pattern binding or unknown, so props never match.
   */
  const localInit = (id: ts.Identifier): ts.Expression | null => {
    for (let n: ts.Node | undefined = id.parent; n && n !== sf; n = n.parent) {
      if (ts.isBlock(n)) {
        for (const st of n.statements) {
          if (!ts.isVariableStatement(st)) continue
          for (const d of st.declarationList.declarations) {
            if (!bindingNames(d.name).includes(id.text)) continue
            return ts.isIdentifier(d.name) && d.initializer
              ? unwrap(d.initializer)
              : null
          }
        }
      }
      if (
        ts.isFunctionLike(n) &&
        n.parameters.some((param) => bindingNames(param.name).includes(id.text))
      )
        return null
    }
    return null
  }

  const isDataLiteral = (e: ts.Expression) =>
    (ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e)) &&
    stringLeaves(e).some(hasWord)

  /**
   * Literals an expression can render, through &&, ||, ??, ?:, parentheses,
   * wrapper calls, local consts and `.map(...)` receivers. `child` also
   * allows glyph strings; `prop` allows only "" (decorative alt).
   */
  const check = (
    expr: ts.Expression,
    kind: "child" | "prop",
    name: string,
    site: ts.Node = expr,
    via?: string,
    depth = 0
  ) => {
    const e = unwrap(expr)
    // Anything found through a local const is reported at the use.
    const report = (what: string, node: ts.Node) =>
      at(
        site,
        via ? `${what} via local const ${via}` : `${what} ${node.getText(sf)}`
      )
    if (isStringLike(e)) {
      const ok = kind === "child" ? GLYPHS.test(e.text) : e.text === ""
      if (!ok) report(kind === "child" ? "string child" : `${name} string`, e)
    } else if (ts.isTemplateExpression(e)) {
      if (kind === "prop" || hasWord(templateText(e)))
        report(kind === "child" ? "template child" : `${name} template`, e)
    } else if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        check(e.left, kind, name, site, via, depth)
        check(e.right, kind, name, site, via, depth)
      }
    } else if (ts.isConditionalExpression(e)) {
      check(e.whenTrue, kind, name, site, via, depth)
      check(e.whenFalse, kind, name, site, via, depth)
    } else if (ts.isIdentifier(e)) {
      const init = depth < 5 ? localInit(e) : null
      if (init) check(init, kind, name, site, via ?? e.text, depth + 1)
    } else if (kind === "child") {
      // `{["One", "Two"].map(...)}`, `{items.map(...)}` over a local
      // literal, or the array itself.
      let source: ts.Expression | undefined
      let receiver = via
      if (ts.isArrayLiteralExpression(e)) source = e
      else if (
        ts.isCallExpression(e) &&
        ts.isPropertyAccessExpression(e.expression)
      )
        source = unwrap(e.expression.expression)
      if (source && ts.isIdentifier(source)) {
        receiver = source.text
        source = localInit(source) ?? undefined
      }
      if (source && isDataLiteral(source))
        at(
          site,
          receiver
            ? `data literal child via local const ${receiver}`
            : `data literal child ${source.getText(sf)}`
        )
    }
  }

  const technical = TECHNICAL_CONSTS[file] ?? []
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/&(nbsp|ldquo|rdquo);/g, "")
      if (!GLYPHS.test(text))
        at(node, `JSX text ${JSON.stringify(node.getText(sf).trim())}`)
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf)
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression && unwrap(node.initializer.expression)
        : node.initializer
      if (CHECKED_PROPS.has(name) && value) {
        if (
          (isStringLike(value) && value.text !== "") ||
          ts.isTemplateExpression(value)
        )
          at(node, `${name}=${node.initializer.getText(sf)}`)
        else if (!isStringLike(value)) check(value, "prop", name)
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      check(node.expression, "child", "")
    } else if (ts.isVariableStatement(node) && node.parent === sf) {
      for (const d of node.declarationList.declarations) {
        const name = d.name.getText(sf)
        if (!d.initializer || technical.includes(name)) continue
        const init = unwrap(d.initializer)
        if (CLASS_NAME.test(name) && stringLeaves(init).every(isClassList))
          continue
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

    it("exempts a *Class const only when every token looks like a class", () => {
      expect(
        hits(`const heroClass = "Welcome to Cleaning Partners"
const NOTE_CLASS = "welcome to us"
const tilesClass = ["flex gap-2", "Book now"]
const okClass = "relative flex w-[120px] md:px-4 hover:bg-brand/10 -mt-2"
const listClass = ["flex", "grid gap-2"] as const
const tplClass = \`rounded-full \${"x"} px-4\`
const frozenClass = Object.freeze({ a: "Our story" })`)
      ).toEqual([
        "1: module-level string heroClass",
        "2: module-level string NOTE_CLASS",
        "3: module-level data literal tilesClass",
        "7: module-level data literal frozenClass",
      ])
    })

    it("looks through Object.freeze and as const", () => {
      expect(
        hits(`const A = Object.freeze("Hello")
const B = Object.freeze(["One", "Two"] as const)
const C = Object.freeze({ label: "Facebook" } as const)
const D = Object.freeze([1, 2])`)
      ).toEqual([
        "1: module-level string A",
        "2: module-level data literal B",
        "3: module-level data literal C",
      ])
    })

    it("flags function-local string consts used as children or checked props", () => {
      expect(
        hits(`export function X({ t }: { t: string }) {
          const title = "Our story"
          const alt = \`A photo\`
          const items = [{ label: "One" }]
          const cond = t ? "Yes" : t
          const fine = t
          return (
            <section>
              <h2>{title}</h2>
              <img alt={alt} src={t} />
              <p>{t && title}</p>
              {items.map((i) => <i key={i.label}>{i.label}</i>)}
              <b>{cond}</b>
              <b>{fine}</b>
            </section>
          )
        }`)
      ).toEqual([
        "9: string child via local const title",
        "10: alt string via local const alt",
        "11: string child via local const title",
        "12: data literal child via local const items",
        "13: string child via local const cond",
      ])
    })

    it("does not confuse a prop with a same-named local const elsewhere", () => {
      expect(
        hits(`function A() { const title = "Hidden"; return <p data-x={title} /> }
export function B({ title }: { title: string }) {
          return <h2>{title}</h2>
        }
export function C() {
          return <h2>{(({ title }: { title: string }) => title)}</h2>
        }`)
      ).toEqual([])
    })

    it("flags ternaries and logical expressions inside checked props", () => {
      expect(
        hits(`export function X({ a }: { a: boolean }) {
          return (
            <div>
              <img alt={a ? "Cat" : "Dog"} src="" />
              <a aria-label={a && "Open"} href={a ? "/x" : undefined} />
              <img alt={a ? "" : undefined} />
            </div>
          )
        }`)
      ).toEqual([
        '4: alt string "Cat"',
        '4: alt string "Dog"',
        '5: aria-label string "Open"',
        '5: href string "/x"',
      ])
    })

    it("flags array literal children and calls on array literals", () => {
      expect(
        hits(`export function X() {
          return (
            <ul>
              {["One", "Two"].map((t) => <li key={t}>{t}</li>)}
              {["a", "b"]}
              {[1, 2].map((n) => <li key={n}>{n}</li>)}
              {([{ label: "Deep" }] as const).map((i) => <li key={i.label} />)}
            </ul>
          )
        }`)
      ).toEqual([
        '4: data literal child ["One", "Two"]',
        '5: data literal child ["a", "b"]',
        '7: data literal child [{ label: "Deep" }]',
      ])
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
