// Shared outside any single feature: the quack feature, the auth session
// (a user's default mood) and the settings feature all need this vocabulary.
export const quackMoods = ["happy", "sad", "angry", "silly"] as const

export type QuackMood = (typeof quackMoods)[number]

// One place for how a mood reads, shared by the quack feed and settings.
export const moodDisplay: Record<QuackMood, { emoji: string; label: string }> = {
  happy: { emoji: "😄", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  silly: { emoji: "🤪", label: "Silly" },
}
