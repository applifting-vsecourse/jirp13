import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

import { useSession } from "@/features/auth/hooks/useSession"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
})

// Searching below this length would match almost everything, so the feed
// stays unfiltered until the query is long enough to be meaningful.
const MIN_SEARCH_LENGTH = 2

function QuacksPage() {
  const { user } = useSession()
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearchInput = useDebouncedValue(searchInput, 300)
  const search =
    debouncedSearchInput.trim().length >= MIN_SEARCH_LENGTH
      ? debouncedSearchInput.trim()
      : undefined

  const [tab, setTab] = useState<"all" | "mine">("all")
  const isMineOnly = tab === "mine"
  const formRef = useRef<HTMLDivElement>(null)

  const quacksQuery = useQuery(quacksQueryOptions(search, isMineOnly))

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <div ref={formRef}>
          <QuackForm
            className="mb-4"
            defaultMood={user?.defaultMood ?? undefined}
          />
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value === "mine" ? "mine" : "all")}
          className="mb-4"
        >
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4">
          <Label
            htmlFor="quack-search"
            className="sr-only"
          >
            Search quacks
          </Label>
          <Input
            id="quack-search"
            type="search"
            placeholder="Search by text or author…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          isFiltered={search !== undefined}
          currentUserId={user?.id}
          isModerator={user?.role === "admin"}
          isMineOnly={isMineOnly}
          onWriteFirst={() => formRef.current?.querySelector("textarea")?.focus()}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
        />
      </section>
    </>
  )
}
