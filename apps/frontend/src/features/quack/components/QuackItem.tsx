import { useState } from "react"
import { MessageSquare } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { QuackMoodLabel } from "@/features/quack/components/QuackMoodLabel"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyItem } from "@/features/quack/components/ReplyItem"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { getInitials } from "@/features/quack/lib/initials"

type QuackItemProps = {
  quack: Quack
  isOwn?: boolean
  canDelete?: boolean
  // Id of the signed-in user. Without it (signed out preview) there is no Reply action.
  currentUserId?: string
  // Moderators (admins) may delete any reply, not only their own.
  isModerator?: boolean
}

export function QuackItem({ quack, isOwn, canDelete, currentUserId, isModerator }: QuackItemProps) {
  const [isReplying, setReplying] = useState(false)
  const canReply = currentUserId !== undefined
  const { user } = quack

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      {user && !quack.deleted ? (
        <Avatar className="size-12">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      ) : (
        // keeps the replies of a placeholder aligned with those of other quacks
        <div
          aria-hidden="true"
          className="size-12 shrink-0"
        />
      )}

      <div className="flex flex-1 flex-col gap-1">
        {user && !quack.deleted ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <span>
                <UsersName name={user.name} /> <UsersUserName username={user.username} />
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
              {quack.mood ? (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <QuackMoodLabel mood={quack.mood} />
                </>
              ) : null}
            </div>
            <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
            {quack.poll ? (
              <QuackPoll
                quackId={quack.id}
                poll={quack.poll}
              />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">This quack was deleted</p>
        )}

        {canReply || (canDelete && !quack.deleted) ? (
          <div className="flex items-center gap-1">
            {canReply ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                aria-expanded={isReplying}
                onClick={() => setReplying((isOpen) => !isOpen)}
              >
                <MessageSquare />
                Reply
              </Button>
            ) : null}
            {canDelete && !quack.deleted ? (
              <DeleteQuackButton
                quackId={quack.id}
                replyCount={quack.replies.length}
                isOwn={isOwn}
              />
            ) : null}
          </div>
        ) : null}

        {quack.replies.length > 0 ? (
          <ul
            aria-label="Replies"
            className="mt-2 flex flex-col gap-4 border-l border-border pl-4"
          >
            {quack.replies.map((reply) => {
              const isOwnReply = currentUserId !== undefined && reply.userId === currentUserId
              return (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  isOwn={isOwnReply}
                  canDelete={isModerator === true || isOwnReply}
                />
              )
            })}
          </ul>
        ) : null}

        {isReplying ? (
          <div className="mt-2">
            <ReplyForm
              quackId={quack.id}
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
