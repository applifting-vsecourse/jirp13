import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { moodDisplay } from "@/lib/moods"
import { cn } from "@/lib/utils"

import { quackMoods, quackMoodSchema, type QuackMood } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

// Poll limits mirror the server (2 to 6 answers, 50 characters each).
const MIN_ANSWERS = 2
const MAX_ANSWERS = 6
const MAX_ANSWER_LENGTH = 50

// Two answers are the same when they match ignoring case and extra spaces,
// the same rule the server applies.
const answerKey = (answer: string) => answer.trim().replace(/\s+/g, " ").toLowerCase()

const emptyAnswers = () => Array.from({ length: MIN_ANSWERS }, () => ({ value: "" }))

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: quackMoodSchema.optional(),
    hasPoll: z.boolean(),
    answers: z.array(z.object({ value: z.string() })),
  })
  .superRefine((values, ctx) => {
    if (!values.hasPoll) return

    const seen = new Set<string>()
    values.answers.forEach((answer, index) => {
      const key = answerKey(answer.value)
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", message, path: ["answers", index, "value"] })

      if (key === "") {
        fail("Write an answer")
      } else if (answer.value.trim().length > MAX_ANSWER_LENGTH) {
        fail(`Keep it under ${MAX_ANSWER_LENGTH} characters`)
      } else if (seen.has(key)) {
        fail("Answers must be different")
      }
      seen.add(key)
    })
  })

type FormValues = z.infer<typeof schema>

type QuackFormProps = { className?: string; defaultMood?: QuackMood }

export function QuackForm({ className, defaultMood }: QuackFormProps) {
  const addQuack = useAddQuack()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    // The caller passes the user's chosen default mood (set in Settings) so
    // it pre-selects the picker — they can still change or clear it before posting.
    defaultValues: { text: "", mood: defaultMood, hasPoll: false, answers: emptyAnswers() },
  })
  const answers = useFieldArray({ control: form.control, name: "answers" })
  const hasPoll = useWatch({ control: form.control, name: "hasPoll" })

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood,
        pollOptions: values.hasPoll
          ? values.answers.map((answer) => answer.value.trim())
          : undefined,
      },
      { onSuccess: () => form.reset() },
    )
  }

  const togglePoll = () => {
    const isEnabled = !hasPoll
    form.setValue("hasPoll", isEnabled)
    // Turning the poll off throws away what was typed; turning it on starts clean.
    answers.replace(emptyAnswers())
    form.clearErrors("answers")
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

        {hasPoll ? (
          <fieldset
            className="space-y-2"
            disabled={addQuack.isPending}
          >
            <legend className="text-sm font-medium">Poll answers</legend>
            {answers.fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field: input }) => (
                  <FormItem>
                    <FormLabel>Answer {index + 1}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          placeholder={index === 0 ? "West bank" : undefined}
                          {...input}
                        />
                      </FormControl>
                      {answers.fields.length > MIN_ANSWERS ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove answer ${index + 1}`}
                          onClick={() => answers.remove(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {answers.fields.length < MAX_ANSWERS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => answers.append({ value: "" })}
              >
                <Plus className="size-4" />
                Add answer
              </Button>
            ) : null}
          </fieldset>
        ) : null}

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={hasPoll}
              disabled={addQuack.isPending}
              onClick={togglePoll}
            >
              Add poll
            </Button>
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
