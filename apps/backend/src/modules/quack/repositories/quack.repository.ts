import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

type PrismaReply = PrismaQuack & { user: PrismaUser | null };

type PrismaQuackWithRelations = PrismaQuack & {
  user?: PrismaUser | null;
  pollOptions?: (PrismaPollOption & { _count: { votes: number } })[];
  // only the viewer's own vote is loaded, so there is at most one
  pollVotes?: { optionId: string }[];
  replies?: PrismaReply[];
};

/** What the service needs to know about a quack before it deletes or replies to it. */
export type QuackTarget = {
  // null on a placeholder
  userId: string | null;
  // set when the quack is a reply
  parentId: string | null;
  deleted: boolean;
};

// Counts and the viewer's vote are read from the stored votes on every call,
// never cached, so they cannot drift from the poll_vote rows.
const buildPoll = (quack: PrismaQuackWithRelations): Poll | null => {
  if (!quack.pollOptions || quack.pollOptions.length === 0) return null;
  const options = quack.pollOptions.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));
  return {
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myVoteOptionId: quack.pollVotes?.[0]?.optionId ?? null,
  };
};

function mapPrismaQuackToDomain(quack: PrismaQuackWithRelations): Quack {
  return {
    id: quack.id,
    text: quack.text,
    mood: quack.mood,
    userId: quack.userId,
    createdAt: quack.createdAt,
    updatedAt: quack.updatedAt,
    parentId: quack.parentId,
    deleted: quack.deletedAt !== null,
    replies: (quack.replies ?? []).map(mapPrismaQuackToDomain),
    user: quack.user
      ? {
          id: quack.user.id,
          name: quack.user.name,
          username: quack.user.username ?? '',
        }
      : undefined,
    poll: buildPoll(quack),
  };
}

const pollInclude = (viewerId: string) =>
  ({
    pollOptions: {
      orderBy: { position: 'asc' },
      include: { _count: { select: { votes: true } } },
    },
    pollVotes: { where: { userId: viewerId }, select: { optionId: true } },
  }) as const;

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(
    viewerId: string,
    search?: string,
    onlyMine?: boolean,
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: {
        // replies are listed under their quack, never as feed items
        parentId: null,
        ...(onlyMine ? { userId: viewerId } : {}),
        ...(search
          ? {
              OR: [
                { text: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                {
                  user: {
                    username: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        user: true,
        ...pollInclude(viewerId),
        replies: { orderBy: { createdAt: 'asc' }, include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    // Display order is the array order. Created in the same write as the quack.
    pollOptions?: { text: string; textKey: string }[];
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: createQuackData.pollOptions && {
          create: createQuackData.pollOptions.map((option, position) => ({
            ...option,
            position,
          })),
        },
      },
      include: { user: true, ...pollInclude(createQuackData.userId) },
    });
    return mapPrismaQuackToDomain(quack);
  }

  /** Author, parent and deleted state of a quack, or null when it does not exist. */
  async getTarget(quackId: string): Promise<QuackTarget | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true, parentId: true, deletedAt: true },
    });
    return quack
      ? {
          userId: quack.userId,
          parentId: quack.parentId,
          deleted: quack.deletedAt !== null,
        }
      : null;
  }

  /**
   * Adds a reply under a top-level quack (the service has checked it is one).
   * Returns null when the parent no longer exists.
   */
  async createReply(data: {
    text: string;
    userId: string;
    parentId: string;
  }): Promise<Quack | null> {
    try {
      const reply = await this.prisma.quack.create({
        data,
        include: { user: true },
      });
      return mapPrismaQuackToDomain(reply);
    } catch (error) {
      // The parent was purged between the service's check and this insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a quack or a reply. With `authorId` it deletes only if that user
   * wrote it, without it the author is not checked. Does nothing for a quack
   * that does not exist or is already a placeholder.
   *
   * - A reply is removed; if that was the last reply under a placeholder, the
   *   placeholder goes too.
   * - A quack without replies is removed (poll options and votes cascade).
   * - A quack with replies becomes a placeholder: its content and poll are
   *   erased and the row stays so the replies keep their anchor.
   *
   * The parent row is locked first. Inserting a reply needs a share lock on its
   * parent, so a concurrent reply waits for us and then either lands under the
   * new placeholder or fails because the parent is gone; the replies check and
   * the delete can never disagree. The parent foreign key is `Restrict`, so
   * even a bug here cannot destroy replies.
   */
  async deleteQuack(quackId: string, authorId?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const quack = await tx.quack.findFirst({
        where: { id: quackId, userId: authorId, deletedAt: null },
        select: { id: true, parentId: true },
      });
      if (!quack) return;

      const lockedId = quack.parentId ?? quack.id;
      const [locked] = await tx.$queryRaw<
        { id: string; deletedAt: Date | null }[]
      >`SELECT "id", "deletedAt" FROM "quack" WHERE "id" = ${lockedId} FOR UPDATE`;
      // Gone while we waited for the lock.
      if (!locked) return;

      if (quack.parentId !== null) {
        await tx.quack.deleteMany({ where: { id: quack.id } });
        if (locked.deletedAt !== null) {
          const remaining = await tx.quack.count({
            where: { parentId: quack.parentId },
          });
          if (remaining === 0) {
            await tx.quack.delete({ where: { id: quack.parentId } });
          }
        }
        return;
      }

      if (locked.deletedAt !== null) return;
      const replyCount = await tx.quack.count({
        where: { parentId: quack.id },
      });
      if (replyCount === 0) {
        await tx.quack.delete({ where: { id: quack.id } });
        return;
      }
      // Votes cascade from the options. The cascade from the quack itself only
      // fires when the row is deleted, which it is not here.
      await tx.pollOption.deleteMany({ where: { quackId: quack.id } });
      await tx.quack.update({
        where: { id: quack.id },
        data: { text: null, mood: null, userId: null, deletedAt: new Date() },
      });
    });
  }

  /** Ids of the quack's poll answers; empty when the quack has no poll or does not exist. */
  async getPollOptionIds(quackId: string): Promise<string[]> {
    const options = await this.prisma.pollOption.findMany({
      where: { quackId },
      select: { id: true },
    });
    return options.map((option) => option.id);
  }

  async getPoll(quackId: string, viewerId: string): Promise<Poll | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      include: pollInclude(viewerId),
    });
    return quack ? buildPoll(quack) : null;
  }

  /**
   * Sets the user's vote on a poll: inserts it, or moves it to another answer.
   * The primary key (quackId, userId) guarantees a single vote per user.
   */
  async setVote(
    quackId: string,
    userId: string,
    optionId: string,
  ): Promise<void> {
    const where = { quackId_userId: { quackId, userId } };
    const write = (): Promise<unknown> =>
      this.prisma.pollVote.upsert({
        where,
        create: { quackId, userId, optionId },
        update: { optionId },
      });

    try {
      await write();
    } catch (error) {
      // Two first votes from the same user raced and one hit the primary key.
      // The row exists now, so running the upsert again takes the update path.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await write();
        return;
      }
      throw error;
    }
  }

  /** Removes the user's vote. Does nothing when they have not voted. */
  async removeVote(quackId: string, userId: string): Promise<void> {
    await this.prisma.pollVote.deleteMany({ where: { quackId, userId } });
  }
}
