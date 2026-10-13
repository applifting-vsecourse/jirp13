import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { castVote, removeVote } from "@/features/quack/api/pollVote"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { pollPercent, QuackPoll } from "@/features/quack/components/QuackPoll"

vi.mock("@/features/quack/api/pollVote", () => ({ castVote: vi.fn(), removeVote: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

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

const quackWith = (value: Poll): Quack => ({
  id: "q1",
  text: "lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: value,
})

// Renders the poll the way the feed does: from the cached quack list, so an
// optimistic update or a refetch changes what is on screen.
function Feed({ fetchQuacks }: { fetchQuacks: () => Promise<Quack[]> }) {
  const { data } = useQuery({ queryKey: quackKeys.list(), queryFn: fetchQuacks })
  const shown = data?.[0]?.poll
  return shown ? (
    <QuackPoll
      quackId="q1"
      poll={shown}
    />
  ) : null
}

const renderPoll = async (initial: Poll, fetchQuacks?: () => Promise<Quack[]>) => {
  const fetchFn = fetchQuacks ?? vi.fn().mockResolvedValue([quackWith(initial)])
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Feed fetchQuacks={fetchFn} />
    </QueryClientProvider>,
  )
  await screen.findByText("West bank")
  return fetchFn
}

// The answer button that holds the given text.
const answer = (text: string): HTMLElement => screen.getByRole("button", { name: new RegExp(text) })

describe("QuackPoll", () => {
  beforeEach(() => {
    vi.mocked(castVote).mockReset()
    vi.mocked(removeVote).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("shows every answer with its vote count and percentage", async () => {
    await renderPoll(poll())

    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(within(answer("West bank")).getByText("3 · 75%")).toBeInTheDocument()
    expect(within(answer("The reeds")).getByText("1 · 25%")).toBeInTheDocument()
    expect(within(answer("Under the bridge")).getByText("0 · 0%")).toBeInTheDocument()
    expect(screen.getByText("4 votes")).toBeInTheDocument()
  })

  it("marks only the answer the user voted for", async () => {
    await renderPoll(poll({ myVoteOptionId: "o2" }))

    expect(answer("The reeds")).toHaveAttribute("aria-pressed", "true")
    expect(answer("West bank")).toHaveAttribute("aria-pressed", "false")
    expect(screen.getAllByLabelText("Your vote")).toHaveLength(1)
  })

  it("shows 0% everywhere before any vote", async () => {
    await renderPoll(
      poll({
        options: [
          { id: "o1", text: "West bank", votes: 0 },
          { id: "o2", text: "B", votes: 0 },
        ],
        totalVotes: 0,
      }),
    )

    expect(screen.getAllByText("0 · 0%")).toHaveLength(2)
    expect(screen.getByText("0 votes")).toBeInTheDocument()
  })

  it("says '1 vote' for a single vote", async () => {
    await renderPoll(
      poll({
        options: [
          { id: "o1", text: "West bank", votes: 1 },
          { id: "o2", text: "B", votes: 0 },
        ],
        totalVotes: 1,
      }),
    )

    expect(screen.getByText("1 vote")).toBeInTheDocument()
  })

  describe("voting", () => {
    it("updates the counts instantly, before the server has answered", async () => {
      vi.mocked(castVote).mockReturnValue(new Promise<Poll>(vi.fn())) // never answers
      await renderPoll(poll())

      await userEvent.click(answer("The reeds"))

      expect(castVote).toHaveBeenCalledWith("q1", "o2")
      expect(within(answer("The reeds")).getByText("2 · 40%")).toBeInTheDocument()
      expect(answer("The reeds")).toHaveAttribute("aria-pressed", "true")
      expect(screen.getByText("5 votes")).toBeInTheDocument()
    })

    it("moves the vote: old answer down by one, new answer up by one", async () => {
      vi.mocked(castVote).mockReturnValue(new Promise<Poll>(vi.fn()))
      await renderPoll(poll({ myVoteOptionId: "o1" }))

      await userEvent.click(answer("The reeds"))

      expect(within(answer("West bank")).getByText("2 · 50%")).toBeInTheDocument()
      expect(within(answer("The reeds")).getByText("2 · 50%")).toBeInTheDocument()
      expect(answer("West bank")).toHaveAttribute("aria-pressed", "false")
      expect(screen.getByText("4 votes")).toBeInTheDocument()
    })

    it("removes the vote when the chosen answer is clicked again", async () => {
      vi.mocked(removeVote).mockReturnValue(new Promise<Poll>(vi.fn()))
      await renderPoll(poll({ myVoteOptionId: "o1" }))

      await userEvent.click(answer("West bank"))

      expect(removeVote).toHaveBeenCalledWith("q1")
      expect(within(answer("West bank")).getByText("2 · 67%")).toBeInTheDocument()
      expect(answer("West bank")).toHaveAttribute("aria-pressed", "false")
      expect(screen.getByText("3 votes")).toBeInTheDocument()
    })

    it("shows the server's numbers after the vote is saved", async () => {
      const afterVote = poll({
        options: [
          { id: "o1", text: "West bank", votes: 3 },
          { id: "o2", text: "The reeds", votes: 6 },
          { id: "o3", text: "Under the bridge", votes: 0 },
        ],
        totalVotes: 9,
        myVoteOptionId: "o2",
      })
      vi.mocked(castVote).mockResolvedValue(afterVote)
      // someone else voted too, so the refetch differs from the local guess
      const fetchQuacks = vi
        .fn()
        .mockResolvedValueOnce([quackWith(poll())])
        .mockResolvedValue([quackWith(afterVote)])
      await renderPoll(poll(), fetchQuacks)

      await userEvent.click(answer("The reeds"))

      await waitFor(() =>
        expect(within(answer("The reeds")).getByText("6 · 67%")).toBeInTheDocument(),
      )
    })

    it("rolls back to the server's numbers and shows a message when the vote fails", async () => {
      vi.mocked(castVote).mockRejectedValue(new Error("boom"))
      await renderPoll(poll())

      await userEvent.click(answer("The reeds"))

      await waitFor(() => expect(toast.error).toHaveBeenCalledOnce())
      expect(vi.mocked(toast.error).mock.calls[0]?.[0]).toMatch(/didn't go through/i)
      await waitFor(() =>
        expect(within(answer("The reeds")).getByText("1 · 25%")).toBeInTheDocument(),
      )
      expect(answer("The reeds")).toHaveAttribute("aria-pressed", "false")
    })

    it("sends rapid clicks one after another, in click order", async () => {
      const order: string[] = []
      let finishFirst: (value: Poll) => void = vi.fn()
      vi.mocked(castVote).mockImplementation((_quackId, optionId) => {
        order.push(`start ${optionId}`)
        if (optionId === "o2") {
          return new Promise<Poll>((resolve) => {
            finishFirst = resolve
          })
        }
        return Promise.resolve(poll({ myVoteOptionId: optionId }))
      })
      await renderPoll(poll())

      await userEvent.click(answer("The reeds"))
      await userEvent.click(answer("Under the bridge"))

      // the second request waits for the first
      expect(order).toEqual(["start o2"])
      finishFirst(poll({ myVoteOptionId: "o2" }))
      await waitFor(() => expect(order).toEqual(["start o2", "start o3"]))
    })
  })
})

describe("pollPercent", () => {
  it("rounds to whole numbers and never divides by zero", () => {
    expect(pollPercent(1, 3)).toBe(33)
    expect(pollPercent(2, 3)).toBe(67)
    expect(pollPercent(0, 0)).toBe(0)
  })
})
