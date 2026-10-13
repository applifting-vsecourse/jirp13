import type { Poll } from "@/features/quack/api/quackSchemas"

// What the poll will look like once the server accepts the vote. Used to
// update the screen instantly; the server's answer replaces it afterwards.
// `optionId` null means "remove my vote".
export function applyVote(poll: Poll, optionId: string | null): Poll {
  if (optionId === poll.myVoteOptionId) return poll

  const options = poll.options.map((option) => {
    if (option.id === poll.myVoteOptionId) return { ...option, votes: option.votes - 1 }
    if (option.id === optionId) return { ...option, votes: option.votes + 1 }
    return option
  })

  return {
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myVoteOptionId: optionId,
  }
}
