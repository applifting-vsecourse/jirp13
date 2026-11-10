import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

export function DeleteQuackButton({
  quackId,
  kind = "quack",
  replyCount = 0,
  isOwn = true,
}: {
  quackId: string
  kind?: "quack" | "reply"
  // Replies under the quack. When there are some, they stay after the delete.
  replyCount?: number
  // false when a moderator deletes someone else's quack
  isOwn?: boolean
}) {
  const [isOpen, setOpen] = useState(false)
  const deleteQuack = useDeleteQuack()

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
        >
          <Trash2 />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this {kind}?</DialogTitle>
          <DialogDescription>
            {isOwn
              ? `It will be removed for everyone. This can't be undone.`
              : `This ${kind} was posted by someone else. Deleting it removes it for everyone and can't be undone.`}
            {replyCount > 0
              ? ` Its ${replyCount === 1 ? "reply stays" : `${replyCount} replies stay`} under a "This quack was deleted" note.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteQuack.isPending}
            onClick={() => deleteQuack.mutate(quackId, { onSuccess: () => setOpen(false) })}
          >
            {deleteQuack.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
