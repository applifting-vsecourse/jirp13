import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"
import { authKeys } from "@/lib/auth-keys"
import type { QuackMood } from "@/lib/moods"

export type UpdateSettingsInput = {
  name: string
  username: string
  bio: string
  defaultMood: QuackMood | null
}

export class UpdateSettingsError extends Error {
  constructor(
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message)
  }
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      const { error } = await authClient.updateUser(input)
      if (error) {
        throw new UpdateSettingsError(error.code, error.message ?? "Couldn't save your settings")
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
