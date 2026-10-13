import { describe, expect, it } from "vitest"

import { applyVote } from "@/features/quack/api/applyVote"
import type { Poll } from "@/features/quack/api/quackSchemas"

const poll = (myVoteOptionId: string | null): Poll => ({
  options: [
    { id: "o1", text: "A", votes: 2 },
    { id: "o2", text: "B", votes: 1 },
  ],
  totalVotes: 3,
  myVoteOptionId,
})

describe("applyVote", () => {
  it("adds a first vote", () => {
    expect(applyVote(poll(null), "o2")).toEqual({
      options: [
        { id: "o1", text: "A", votes: 2 },
        { id: "o2", text: "B", votes: 2 },
      ],
      totalVotes: 4,
      myVoteOptionId: "o2",
    })
  })

  it("moves a vote without changing the total", () => {
    expect(applyVote(poll("o1"), "o2")).toEqual({
      options: [
        { id: "o1", text: "A", votes: 1 },
        { id: "o2", text: "B", votes: 2 },
      ],
      totalVotes: 3,
      myVoteOptionId: "o2",
    })
  })

  it("removes a vote", () => {
    expect(applyVote(poll("o1"), null)).toEqual({
      options: [
        { id: "o1", text: "A", votes: 1 },
        { id: "o2", text: "B", votes: 1 },
      ],
      totalVotes: 2,
      myVoteOptionId: null,
    })
  })

  it("changes nothing when the vote is already there", () => {
    const current = poll("o1")
    expect(applyVote(current, "o1")).toBe(current)
    const none = poll(null)
    expect(applyVote(none, null)).toBe(none)
  })
})
