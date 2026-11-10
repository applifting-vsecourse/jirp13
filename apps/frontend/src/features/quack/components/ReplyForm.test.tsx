import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import { ReplyForm } from "@/features/quack/components/ReplyForm"

vi.mock("@/features/quack/api/addReply", () => ({ addReply: vi.fn() }))

const renderForm = (onDone = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReplyForm
        quackId="q1"
        onDone={onDone}
      />
    </QueryClientProvider>,
  )
  return onDone
}

describe("ReplyForm", () => {
  beforeEach(() => {
    vi.mocked(addReply).mockReset()
    vi.mocked(addReply).mockResolvedValue({
      id: "r1",
      text: "me too",
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
    })
  })

  it("posts the trimmed text to the quack and closes", async () => {
    const onDone = renderForm()

    await userEvent.type(screen.getByLabelText("Your reply"), "  me too  ")
    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    await waitFor(() => expect(addReply).toHaveBeenCalledWith("q1", "me too"))
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
  })

  it("rejects an empty reply without calling the server", async () => {
    const onDone = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByText("Write something first")).toBeInTheDocument()
    expect(addReply).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("rejects a reply over 280 characters", async () => {
    renderForm()

    await userEvent.click(screen.getByLabelText("Your reply"))
    await userEvent.paste("x".repeat(281))
    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByText("Keep it under 280 characters")).toBeInTheDocument()
    expect(addReply).not.toHaveBeenCalled()
  })

  it("shows the server's error and stays open", async () => {
    vi.mocked(addReply).mockRejectedValue(new Error("Quack not found"))
    const onDone = renderForm()

    await userEvent.type(screen.getByLabelText("Your reply"), "hello")
    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByText("Quack not found")).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("closes on Cancel without posting", async () => {
    const onDone = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onDone).toHaveBeenCalledOnce()
    expect(addReply).not.toHaveBeenCalled()
  })
})
