import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { applyVote } from "@/features/quack/api/applyVote"
import { castVote, removeVote } from "@/features/quack/api/pollVote"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

// `optionId` null removes the user's vote.
type VoteInput = { optionId: string | null }

export function useVote(quackId: string) {
  const queryClient = useQueryClient()
  const mutationKey = ["poll-vote", quackId]

  return useMutation({
    mutationKey,
    // Clicks on one poll run one after another, in click order, so a slow
    // earlier request can never land after a later one.
    scope: { id: `poll-vote-${quackId}` },
    mutationFn: ({ optionId }: VoteInput) =>
      optionId ? castVote(quackId, optionId) : removeVote(quackId),
    onMutate: async ({ optionId }) => {
      // Stop an in-flight refetch from overwriting the optimistic state.
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
        quacks?.map((quack) =>
          quack.id === quackId && quack.poll
            ? { ...quack, poll: applyVote(quack.poll, optionId) }
            : quack,
        ),
      )
    },
    onError: () => {
      toast.error("Your vote didn't go through. The poll shows the current results.")
    },
    onSettled: async () => {
      // Refetch once the last queued click is done: it replaces the guess with
      // the server's numbers, which is also the rollback when a vote failed.
      // This mutation still counts as running here, hence <= 1.
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
      }
    },
  })
}
