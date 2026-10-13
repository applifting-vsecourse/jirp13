import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import { SettingsForm } from "@/features/settings/components/SettingsForm"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useSession()

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Settings</h1>

        {/* The protected layout's loader already ensures the session is
            loaded before this page renders, so `user` is never null here. */}
        {user ? <SettingsForm user={user} /> : null}
      </section>
    </>
  )
}
