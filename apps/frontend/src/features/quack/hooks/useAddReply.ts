import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"

// Like useAddQuack: the hook owns the mutation, the form owns its state.
export function useAddReply(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => addReply(quackId, text),
    onSuccess: async () => {
      // Replies come with the feed, so refresh it.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
