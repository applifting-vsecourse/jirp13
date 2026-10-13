import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { pollPercent, QuackPoll } from "@/features/quack/components/QuackPoll"

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  options: [
    { id: "o1", text: "West bank", votes: 3 },
    { id: "o2", text: "The reeds", votes: 1 },
    { id: "o3", text: "Under the bridge", votes: 0 },
  ],
  totalVotes: 4,
  myVoteOptionId: null,
  ...overrides,
})

// The list row that holds the given answer text.
const row = (answer: string): HTMLElement => {
  const item = screen.getByText(answer).closest("li")
  if (!item) throw new Error(`No row for ${answer}`)
  return item
}

describe("QuackPoll", () => {
  it("shows every answer with its vote count and percentage", () => {
    render(<QuackPoll poll={poll()} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(within(row("West bank")).getByText("3 · 75%")).toBeInTheDocument()
    expect(within(row("The reeds")).getByText("1 · 25%")).toBeInTheDocument()
    expect(within(row("Under the bridge")).getByText("0 · 0%")).toBeInTheDocument()
    expect(screen.getByText("4 votes")).toBeInTheDocument()
  })

  it("marks only the answer the user voted for", () => {
    render(<QuackPoll poll={poll({ myVoteOptionId: "o2" })} />)

    expect(within(row("The reeds")).getByLabelText("Your vote")).toBeInTheDocument()
    expect(screen.getAllByLabelText("Your vote")).toHaveLength(1)
  })

  it("shows 0% everywhere and singular wording before any vote", () => {
    render(
      <QuackPoll
        poll={poll({
          options: [
            { id: "o1", text: "A", votes: 0 },
            { id: "o2", text: "B", votes: 0 },
          ],
          totalVotes: 0,
        })}
      />,
    )

    expect(screen.getAllByText("0 · 0%")).toHaveLength(2)
    expect(screen.getByText("0 votes")).toBeInTheDocument()
  })

  it("says '1 vote' for a single vote", () => {
    render(
      <QuackPoll
        poll={poll({
          options: [
            { id: "o1", text: "A", votes: 1 },
            { id: "o2", text: "B", votes: 0 },
          ],
          totalVotes: 1,
        })}
      />,
    )

    expect(screen.getByText("1 vote")).toBeInTheDocument()
  })
})

describe("pollPercent", () => {
  it("rounds to whole numbers and never divides by zero", () => {
    expect(pollPercent(1, 3)).toBe(33)
    expect(pollPercent(2, 3)).toBe(67)
    expect(pollPercent(0, 0)).toBe(0)
  })
})
