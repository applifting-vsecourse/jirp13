import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackForm />
    </QueryClientProvider>,
  )

describe("QuackForm", () => {
  beforeEach(() => {
    vi.mocked(addQuack).mockReset()
    vi.mocked(addQuack).mockResolvedValue({
      id: "q1",
      text: "honk",
      mood: null,
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
      poll: null,
    })
  })

  it("posts without a mood when none is chosen", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "honk")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(addQuack).toHaveBeenCalledWith({ text: "honk", mood: undefined }, expect.anything())
  })

  it("posts the chosen mood", async () => {
    renderForm()

    expect(screen.getByRole("radiogroup", { name: /mood/i })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("New quack"), "honk")
    await userEvent.click(screen.getByRole("radio", { name: /silly/i }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(addQuack).toHaveBeenCalledWith({ text: "honk", mood: "silly" }, expect.anything())
  })

  it("clears the mood when the chosen one is clicked again", async () => {
    renderForm()

    const silly = screen.getByRole("radio", { name: /silly/i })
    await userEvent.click(silly)
    expect(silly).toBeChecked()
    await userEvent.click(silly)
    expect(silly).not.toBeChecked()

    await userEvent.type(screen.getByLabelText("New quack"), "honk")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(addQuack).toHaveBeenCalledWith({ text: "honk", mood: undefined }, expect.anything())
  })

  describe("poll", () => {
    const openPoll = async () => {
      await userEvent.type(screen.getByLabelText("New quack"), "lunch?")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    }
    const submit = () => userEvent.click(screen.getByRole("button", { name: "Quack" }))

    it("has no answer inputs until the poll is switched on", async () => {
      renderForm()
      expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))

      expect(screen.getByLabelText("Answer 1")).toBeInTheDocument()
      expect(screen.getByLabelText("Answer 2")).toBeInTheDocument()
      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
    })

    it("posts trimmed answers in order", async () => {
      renderForm()
      await openPoll()
      await userEvent.type(screen.getByLabelText("Answer 1"), "  West bank ")
      await userEvent.type(screen.getByLabelText("Answer 2"), "The reeds")
      await submit()

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(addQuack).toHaveBeenCalledWith(
        { text: "lunch?", mood: undefined, pollOptions: ["West bank", "The reeds"] },
        expect.anything(),
      )
    })

    it("grows to 6 answers and shrinks back to 2", async () => {
      renderForm()
      await openPoll()

      for (let i = 0; i < 4; i++) {
        await userEvent.click(screen.getByRole("button", { name: "Add answer" }))
      }
      expect(screen.getByLabelText("Answer 6")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Add answer" })).not.toBeInTheDocument()

      for (let i = 0; i < 4; i++) {
        await userEvent.click(screen.getByRole("button", { name: "Remove answer 3" }))
      }
      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /remove answer/i })).not.toBeInTheDocument()
    })

    it("blocks posting and explains empty, long and duplicate answers", async () => {
      renderForm()
      await openPoll()
      await userEvent.type(screen.getByLabelText("Answer 1"), "Pizza")
      await submit()
      expect(await screen.findByText("Write an answer")).toBeInTheDocument()

      await userEvent.type(screen.getByLabelText("Answer 2"), "  pizza ")
      await submit()
      expect(await screen.findByText("Answers must be different")).toBeInTheDocument()

      await userEvent.clear(screen.getByLabelText("Answer 2"))
      await userEvent.type(screen.getByLabelText("Answer 2"), "x".repeat(51))
      await submit()
      expect(await screen.findByText("Keep it under 50 characters")).toBeInTheDocument()

      expect(addQuack).not.toHaveBeenCalled()
    })

    it("sends no poll after the poll is switched off again", async () => {
      renderForm()
      await openPoll()
      await userEvent.type(screen.getByLabelText("Answer 1"), "A")
      await userEvent.click(screen.getByRole("button", { name: "Add poll" }))
      expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
      await submit()

      await waitFor(() => expect(addQuack).toHaveBeenCalled())
      expect(addQuack).toHaveBeenCalledWith({ text: "lunch?", mood: undefined }, expect.anything())
    })
  })
})
