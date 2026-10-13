import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Poll } from "@/features/quack/api/quackSchemas"

// Whole-number percentage of all votes. No votes yet means 0%, not NaN.
// Rounded values may not add up to exactly 100; the counts are the exact numbers.
export const pollPercent = (votes: number, totalVotes: number): number =>
  totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)

type QuackPollProps = { poll: Poll }

export function QuackPoll({ poll }: QuackPollProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const percent = pollPercent(option.votes, poll.totalVotes)
          const isMine = option.id === poll.myVoteOptionId

          return (
            <li
              key={option.id}
              className={cn(
                "relative flex items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-sm",
                isMine ? "border-primary" : "border-border",
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-secondary"
                style={{ width: `${percent}%` }}
              />
              <span className="relative flex items-center gap-2 break-words">
                {isMine ? (
                  <Check
                    className="size-4 shrink-0"
                    aria-label="Your vote"
                  />
                ) : null}
                {option.text}
              </span>
              <span className="relative shrink-0 text-muted-foreground">
                {option.votes} · {percent}%
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
      </p>
    </div>
  )
}
