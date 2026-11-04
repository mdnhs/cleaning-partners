import { describe, expect, it } from "vitest"

import { CV_MAX_BYTES, prepareCv, sniffCv } from "@/server/lib/cv"
import { AppError } from "@/server/lib/errors"

const bytes = (...parts: (number[] | string)[]) => {
  const out: number[] = []
  for (const part of parts)
    out.push(
      ...(typeof part === "string" ? [...new TextEncoder().encode(part)] : part)
    )
  return new Uint8Array(out)
}
const file = (data: Uint8Array, name: string, type = "") =>
  new File([new Uint8Array(data)], name, { type })

const PDF = bytes("%PDF-1.7\n%âãÏÓ\n1 0 obj\n")
const DOC = bytes(
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  "rest of an OLE file"
)
/** A ZIP local header whose entry names include the Word body. */
const DOCX = bytes(
  [0x50, 0x4b, 0x03, 0x04],
  "....[Content_Types].xml....word/document.xml...."
)
const LOTTIE = bytes(
  [0x50, 0x4b, 0x03, 0x04],
  "....manifest.json....animations/a.json"
)
const EXE = bytes(
  "MZ",
  [0x90, 0x00, 0x03],
  "This program cannot be run in DOS mode"
)

const fieldOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (err) {
    expect(err).toBeInstanceOf(AppError)
    return (err as AppError).details?.fieldErrors?.cv?.[0]
  }
  throw new Error("expected a rejection")
}

describe("sniffCv", () => {
  it("knows PDF, DOC and DOCX by their bytes", () => {
    expect(sniffCv(PDF)).toBe("application/pdf")
    expect(sniffCv(DOC)).toBe("application/msword")
    expect(sniffCv(DOCX)).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
  })

  it("refuses other ZIPs and anything else", () => {
    expect(sniffCv(LOTTIE)).toBeNull()
    expect(sniffCv(EXE)).toBeNull()
    expect(sniffCv(bytes("plain text"))).toBeNull()
  })
})

describe("prepareCv", () => {
  it("no file is no CV", async () => {
    expect(await prepareCv(undefined)).toBeNull()
    expect(await prepareCv("")).toBeNull()
    expect(await prepareCv(file(new Uint8Array(), "empty.pdf"))).toBeNull()
  })

  it("keeps a PDF with its sniffed type, extension and a clean name", async () => {
    const cv = await prepareCv(file(PDF, "../Mary Kelly CV.pdf", "image/png"))
    expect(cv).toMatchObject({
      mime: "application/pdf",
      ext: "pdf",
      size: PDF.byteLength,
      originalName: "Mary Kelly CV.pdf",
    })
  })

  it("rejects a disguised or oversized CV", async () => {
    expect(
      await fieldOf(prepareCv(file(EXE, "cv.pdf", "application/pdf")))
    ).toBe("Upload a PDF, DOC or DOCX file")
    const big = new Uint8Array(CV_MAX_BYTES + 1)
    big.set(PDF)
    expect(await fieldOf(prepareCv(file(big, "cv.pdf")))).toBe(
      "CVs can be up to 5 MB"
    )
    expect(CV_MAX_BYTES).toBe(5 * 1024 * 1024)
  })
})
