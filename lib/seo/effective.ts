/** A stored SEO string, or null when blank (a cleared field means "use the fallback"). */
export function filled(value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? value : null
}
