import { PrismaService } from '@/core/prisma/prisma.service';
import {
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

  async getQuacks(viewerId: string, search?: string): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: search
        ? {
            OR: [
              { text: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              {
                user: { username: { contains: search, mode: 'insensitive' } },
              },
            ],
          }
        : undefined,
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
}
