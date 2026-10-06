import type { QuackMood } from "@/features/quack/api/quackSchemas"

// One place for how a mood reads, shared by the form and the feed.
export const moodDisplay: Record<QuackMood, { emoji: string; label: string }> = {
  happy: { emoji: "😄", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  silly: { emoji: "🤪", label: "Silly" },
}
