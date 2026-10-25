"use client"

import { Button } from "@/components/ui/button"

import { useSignOut } from "./sign-out-button"

/**
 * The plain header's sign-out (Phase 2 panel frame). Phase 4's shell replaces
 * it with the user menu and the sidebar dock; both use useSignOut.
 */
export function SignOutControl() {
  const { signOut, pending, error } = useSignOut()
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={signOut}
        disabled={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
