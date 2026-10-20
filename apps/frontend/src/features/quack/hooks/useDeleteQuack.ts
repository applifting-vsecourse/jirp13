import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    onError: () => {
      toast.error("Couldn't delete the quack. Try again.")
    },
    onSettled: async () => {
      // Refetch on success (it disappears) and on failure (it may be gone already).
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
