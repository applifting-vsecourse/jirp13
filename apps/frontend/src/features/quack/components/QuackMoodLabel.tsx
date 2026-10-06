import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { moodDisplay } from "@/features/quack/lib/moods"

type QuackMoodLabelProps = { mood: QuackMood }

export function QuackMoodLabel({ mood }: QuackMoodLabelProps) {
  const { emoji, label } = moodDisplay[mood]

  return (
    <span className="text-xs text-muted-foreground">
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  )
}
