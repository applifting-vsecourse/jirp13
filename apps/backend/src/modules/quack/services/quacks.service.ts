import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  pollOptionKey,
} from '@/modules/quack/domain/poll';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(user: Identity, search?: string): Promise<Quack[]> {
    // the viewer is needed so each poll can report which answer they picked
    return this.quackRepository.getQuacks(user.id, search);
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood; pollOptions?: string[] },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      pollOptions: this.toPollOptions(quackData.pollOptions),
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  private toPollOptions(
    answers?: string[],
  ): { text: string; textKey: string }[] | undefined {
    if (!answers) return undefined;

    const options = answers.map((answer) => ({
      text: answer.trim(),
      textKey: pollOptionKey(answer),
    }));

    if (
      options.length < POLL_MIN_OPTIONS ||
      options.length > POLL_MAX_OPTIONS
    ) {
      throw new BadRequestException(
        `A poll needs ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} answers`,
      );
    }
    if (options.some((option) => option.textKey === '')) {
      throw new BadRequestException('Poll answers cannot be empty');
    }
    if (
      new Set(options.map((option) => option.textKey)).size !== options.length
    ) {
      throw new BadRequestException('Poll answers must be different');
    }
    return options;
  }
}
