import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack } from '@/generated/prisma/client';
import { pollOptionKey } from '@/modules/quack/domain/poll';
import { QuackMood } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  userId: string;
  mood?: QuackMood;
  // Answers for an attached poll, in display order. Omit for a plain quack.
  pollOptions?: string[];
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, userId, mood, createdAt, pollOptions } = params;

  return await prisma.quack.create({
    data: {
      text,
      mood,
      createdAt,
      pollOptions: pollOptions && {
        create: pollOptions.map((optionText, position) => ({
          text: optionText,
          textKey: pollOptionKey(optionText),
          position,
        })),
      },
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}
