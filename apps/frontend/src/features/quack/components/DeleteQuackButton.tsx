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
  isOwn = true,
}: {
  quackId: string
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
          <DialogTitle>Delete this quack?</DialogTitle>
          <DialogDescription>
            {isOwn
              ? "It will be removed from the feed for everyone. This can't be undone."
              : "This quack was posted by someone else. Deleting it removes it for everyone and can't be undone."}
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
