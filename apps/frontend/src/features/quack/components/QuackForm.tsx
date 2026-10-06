import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import { quackMoods, quackMoodSchema } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import { moodDisplay } from "@/features/quack/lib/moods"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  mood: quackMoodSchema.optional(),
})

type FormValues = z.infer<typeof schema>

type QuackFormProps = { className?: string }

export function QuackForm({ className }: QuackFormProps) {
  const addQuack = useAddQuack()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: undefined },
  })

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate({ text: values.text, mood: values.mood }, { onSuccess: () => form.reset() })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Quack something..."
                  disabled={addQuack.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem>
                <FormLabel id={moodLabelId}>
                  Mood <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  {/* Single choice that can be cleared again: clicking the
                      selected mood deselects it and Radix reports "". */}
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    role="radiogroup"
                    aria-labelledby={moodLabelId}
                    disabled={addQuack.isPending}
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      const parsed = quackMoodSchema.safeParse(value)
                      field.onChange(parsed.success ? parsed.data : undefined)
                    }}
                  >
                    {quackMoods.map((mood) => (
                      <ToggleGroupItem
                        key={mood}
                        value={mood}
                      >
                        <span aria-hidden="true">{moodDisplay[mood].emoji}</span>
                        {moodDisplay[mood].label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={addQuack.isPending}
            >
              {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Quack
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
