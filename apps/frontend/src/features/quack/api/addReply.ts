import { api } from "@/lib/api-client"

import { replySchema, type Reply } from "@/features/quack/api/quackSchemas"

export async function addReply(quackId: string, text: string): Promise<Reply> {
  const json = await api.post(`quacks/${quackId}/replies`, { json: { text } }).json()
  return replySchema.parse(json)
}
