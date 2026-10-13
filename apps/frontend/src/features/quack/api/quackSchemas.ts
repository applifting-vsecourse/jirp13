import { z } from "zod"

import { quackMoods } from "@/lib/moods"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export { quackMoods }

// Mirrors the server-side QuackMood enum.
export const quackMoodSchema = z.enum(quackMoods)

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().int().nonnegative(),
})

export const pollSchema = z.object({
  options: z.array(pollOptionSchema),
  totalVotes: z.number().int().nonnegative(),
  // the signed-in user's chosen answer, if any
  myVoteOptionId: z.string().nullable(),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Poll = z.infer<typeof pollSchema>
export type PollOption = z.infer<typeof pollOptionSchema>
export type Quack = z.infer<typeof quackSchema>
export type QuackMood = z.infer<typeof quackMoodSchema>
