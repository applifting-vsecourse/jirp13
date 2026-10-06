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
})
