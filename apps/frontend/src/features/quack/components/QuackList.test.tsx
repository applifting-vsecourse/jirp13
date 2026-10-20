// Example component test — the pattern to copy for your own components.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("renders the poll of a quack that has one, and none otherwise", () => {
    const poll = {
      options: [
        { id: "o1", text: "West bank", votes: 1 },
        { id: "o2", text: "The reeds", votes: 0 },
      ],
      totalVotes: 1,
      myVoteOptionId: null,
    }
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList quacks={[quack({ poll })]} />
      </QueryClientProvider>,
    )
    expect(screen.getByText("West bank")).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList quacks={[quack()]} />
      </QueryClientProvider>,
    )
    expect(screen.queryByText("West bank")).not.toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    render(<QuackList quacks={[quack({ mood: "angry" })]} />)

    expect(screen.getByText("Angry")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    render(<QuackList quacks={[quack()]} />)

    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("shows a search-specific empty state when filtered", () => {
    render(
      <QuackList
        quacks={[]}
        isFiltered
      />,
    )

    expect(screen.getByText("No quacks match your search.")).toBeInTheDocument()
  })
  it("offers Delete only on the signed-in user's own quacks", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList
          currentUserId="u1"
          quacks={[
            quack({ id: "q1", text: "mine" }),
            quack({ id: "q2", userId: "u2", text: "theirs" }),
          ]}
        />
      </QueryClientProvider>,
    )

    expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(1)
  })

  it("asks for confirmation before deleting", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <QuackList
          currentUserId="u1"
          quacks={[quack()]}
        />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /delete/i }))
    expect(screen.getByText("Delete this quack?")).toBeInTheDocument()
  })

  it("offers to write the first quack on an empty Mine tab", async () => {
    const onWriteFirst = vi.fn()
    render(
      <QuackList
        quacks={[]}
        isMineOnly
        onWriteFirst={onWriteFirst}
      />,
    )

    expect(screen.getByText("You haven't posted any quacks yet.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /write your first quack/i }))
    expect(onWriteFirst).toHaveBeenCalledOnce()
  })
})
