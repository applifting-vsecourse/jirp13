import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = (search?: string, isMine?: boolean) =>
  queryOptions({
    queryKey: quackKeys.list(search, isMine),
    queryFn: async () =>
      quacksSchema.parse(
        await api
          .get("quacks", {
            searchParams: {
              ...(search ? { search } : {}),
              ...(isMine ? { mine: true } : {}),
            },
          })
          .json(),
      ),
  })
