import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Reply } from "@/features/quack/api/quackSchemas"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { getInitials } from "@/features/quack/lib/initials"

type ReplyItemProps = { reply: Reply; isOwn?: boolean; canDelete?: boolean }

export function ReplyItem({ reply, isOwn, canDelete }: ReplyItemProps) {
  const { name, username } = reply.user

  return (
    <li className="flex gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={name} /> <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
        </div>
        <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
        {canDelete ? (
          <DeleteQuackButton
            quackId={reply.id}
            kind="reply"
            isOwn={isOwn}
          />
        ) : null}
      </div>
    </li>
  )
}
