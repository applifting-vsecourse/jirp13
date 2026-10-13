import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"
import { authKeys } from "@/lib/auth-keys"

type SignInInput = {
  email: string
  password: string
  rememberMe?: boolean
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: SignInInput) => {
      const { error } = await authClient.signIn.email({ email, password, rememberMe })
      if (error) throw new Error(error.message ?? "Sign in failed")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
