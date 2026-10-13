import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

// The server answers with the poll as it is after the change, counts included.
export async function castVote(quackId: string, optionId: string): Promise<Poll> {
  const json = await api.put(`quacks/${quackId}/vote`, { json: { optionId } }).json()
  return pollSchema.parse(json)
}

export async function removeVote(quackId: string): Promise<Poll> {
  const json = await api.delete(`quacks/${quackId}/vote`).json()
  return pollSchema.parse(json)
}
