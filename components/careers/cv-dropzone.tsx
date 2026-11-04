"use client"

import { FileText, Upload, X } from "lucide-react"
import { useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const CV_EXTENSIONS = /\.(pdf|docx?)$/i
const CV_MAX_BYTES = 5 * 1024 * 1024

/**
 * The optional CV: drop a file or browse. PDF, DOC or DOCX up to 5 MB is
 * checked here for a quick answer; the server checks the bytes again.
 */
export function CvDropzone({
  name,
  label,
  drop,
  browse,
  help,
  typeError,
  sizeError,
  error,
  onChange,
}: {
  name: string
  label: string
  drop: string
  browse: string
  help: string
  typeError: string
  sizeError: string
  /** A server-side error for the field. */
  error?: string
  onChange?: (file: File | null) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [over, setOver] = useState(false)

  const choose = (next: File | null) => {
    if (next && !CV_EXTENSIONS.test(next.name)) {
      setProblem(typeError)
      return clear()
    }
    if (next && next.size > CV_MAX_BYTES) {
      setProblem(sizeError)
      return clear()
    }
    setProblem(null)
    setFile(next)
    onChange?.(next)
    // Keep the input's own file list in step with a dropped file.
    if (next && input.current && typeof DataTransfer !== "undefined") {
      try {
        const list = new DataTransfer()
        list.items.add(next)
        input.current.files = list.files
      } catch {
        // Older browsers: the file is still sent from state by the form.
      }
    }
  }
  const clear = () => {
    setFile(null)
    onChange?.(null)
    if (input.current) input.current.value = ""
  }
  const message = problem ?? error

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-heading text-[15px] leading-[1.35] font-semibold text-ink"
      >
        {label}
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          choose(event.dataTransfer.files[0] ?? null)
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed px-6 py-8 text-center transition-colors focus-within:ring-3 focus-within:ring-brand/25",
          over
            ? "border-brand bg-[#e6f7fb]"
            : "border-brand/70 bg-[#f9fcfd] hover:border-brand",
          message && "border-destructive"
        )}
      >
        {file ? (
          <p className="relative z-10 flex items-center gap-2 font-heading text-[17px] font-semibold text-ink">
            <FileText aria-hidden className="size-5 text-brand" />
            {file.name}
            <button
              type="button"
              onClick={clear}
              className="inline-flex size-7 items-center justify-center rounded-full hover:bg-surface"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">{label}</span>
            </button>
          </p>
        ) : (
          <>
            <span className="flex size-[52px] items-center justify-center rounded-[14px] bg-[#e6f7fb]">
              <Upload aria-hidden className="size-[23px] text-brand-deep" />
            </span>
            <p className="font-heading text-[17px] leading-[1.3] font-semibold text-ink">
              {drop}
              <span className="text-[#0b88a3]">{browse}</span>
            </p>
          </>
        )}
        <p className="text-[13px] leading-[1.55] text-body">{help}</p>
        <input
          ref={input}
          id={id}
          name={name}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
      {message ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  )
}
