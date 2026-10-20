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

type PrismaQuackWithRelations = PrismaQuack & {
  user?: PrismaUser;
  pollOptions: (PrismaPollOption & { _count: { votes: number } })[];
  // only the viewer's own vote is loaded, so there is at most one
  pollVotes: { optionId: string }[];
};

// Counts and the viewer's vote are read from the stored votes on every call,
// never cached, so they cannot drift from the poll_vote rows.
const buildPoll = (quack: PrismaQuackWithRelations): Poll | null => {
  if (quack.pollOptions.length === 0) return null;
  const options = quack.pollOptions.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));
  return {
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myVoteOptionId: quack.pollVotes[0]?.optionId ?? null,
  };
};

const mapPrismaQuackToDomain = (quack: PrismaQuackWithRelations): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : undefined,
  poll: buildPoll(quack),
});

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
      include: { user: true, ...pollInclude(viewerId) },
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

  /** Id of the quack's author, or null when the quack does not exist. */
  async getAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  /**
   * Deletes the quack; options and votes cascade. With `authorId` it deletes
   * only if that user wrote it, without it the author is not checked.
   */
  async deleteQuack(quackId: string, authorId?: string): Promise<void> {
    await this.prisma.quack.deleteMany({
      where: { id: quackId, userId: authorId },
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
