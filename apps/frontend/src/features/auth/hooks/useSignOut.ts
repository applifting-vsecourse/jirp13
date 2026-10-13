import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { authClient } from "@/lib/auth-client"
import { authKeys } from "@/lib/auth-keys"

export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authClient.signOut().then(() => undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
      await navigate({ to: "/login" })
    },
  })
}
