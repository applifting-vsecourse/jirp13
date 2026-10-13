import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
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
import { moodDisplay, quackMoods, type QuackMood } from "@/lib/moods"
import { cn } from "@/lib/utils"

import { UpdateSettingsError, useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings"

const BIO_MAX_LENGTH = 160
// Letters, numbers, dots and underscores — mirrors the backend's validator.
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/

const moodOptions = ["none", ...quackMoods] as const

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Must be 3–30 characters")
    .max(30, "Must be 3–30 characters")
    .regex(USERNAME_PATTERN, "Only letters, numbers, dots and underscores"),
  name: z.string().trim().min(1, "Enter a display name"),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Keep it under ${BIO_MAX_LENGTH} characters`),
  defaultMood: z.enum(moodOptions),
})

type FormValues = z.infer<typeof schema>

// Kept local (not imported from the auth feature) so this feature only
// depends on itself and shared `@/lib` code, per the project's feature
// isolation rule.
export type SettingsFormUser = {
  username: string
  name: string
  bio: string
  defaultMood: QuackMood | null
}

const toFormValues = (user: SettingsFormUser): FormValues => ({
  username: user.username,
  name: user.name,
  bio: user.bio,
  defaultMood: user.defaultMood ?? "none",
})

type SettingsFormProps = { user: SettingsFormUser }

export function SettingsForm({ user }: SettingsFormProps) {
  const updateSettings = useUpdateSettings()
  const moodLabelId = useId()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(user),
  })

  const handleSubmit = (values: FormValues) => {
    updateSettings.mutate(
      {
        name: values.name,
        username: values.username,
        bio: values.bio,
        defaultMood: values.defaultMood === "none" ? null : values.defaultMood,
      },
      {
        onSuccess: () => {
          toast.success("Settings saved")
          form.reset(values)
        },
        onError: (error) => {
          if (error instanceof UpdateSettingsError && error.code === "USERNAME_IS_ALREADY_TAKEN") {
            form.setError("username", { message: "That username is already taken" })
          }
        },
      },
    )
  }

  const isUsernameTakenError =
    updateSettings.error instanceof UpdateSettingsError &&
    updateSettings.error.code === "USERNAME_IS_ALREADY_TAKEN"
  const shouldShowGenericError = Boolean(updateSettings.error) && !isUsernameTakenError

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {shouldShowGenericError ? (
          <Alert variant="destructive">
            <AlertDescription>{updateSettings.error?.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  disabled={updateSettings.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  disabled={updateSettings.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => {
            const length = field.value.length
            return (
              <FormItem>
                <div className="flex items-baseline justify-between gap-3">
                  <FormLabel>
                    Bio <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <span
                    className={cn(
                      "text-sm",
                      length > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {length}/{BIO_MAX_LENGTH}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    rows={3}
                    disabled={updateSettings.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel id={moodLabelId}>Default mood for new posts</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  role="radiogroup"
                  aria-labelledby={moodLabelId}
                  disabled={updateSettings.isPending}
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                >
                  <ToggleGroupItem value="none">None</ToggleGroupItem>
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
            type="submit"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={updateSettings.isPending || !form.formState.isDirty}
            onClick={() => form.reset()}
          >
            Discard
          </Button>
        </div>
      </form>
    </Form>
  )
}
