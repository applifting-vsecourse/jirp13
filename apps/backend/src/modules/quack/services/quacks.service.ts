import {
  Poll,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  pollOptionKey,
} from '@/modules/quack/domain/poll';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    user: Identity,
    search?: string,
    onlyMine?: boolean,
  ): Promise<Quack[]> {
    // the viewer is needed so each poll can report which answer they picked
    return this.quackRepository.getQuacks(user.id, search, onlyMine);
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

  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.getAuthorId(quackId);
    if (authorId === null) throw new NotFoundException('Quack not found');
    if (authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    // the repository re-checks the author, so a race cannot delete another's quack
    await this.quackRepository.deleteQuack(quackId, user.id);
  }

  /** Sets (or changes) the user's vote. Safe to repeat. */
  async vote(user: Identity, quackId: string, optionId: string): Promise<Poll> {
    // Options never change after a poll is created, so checking before the
    // write cannot go stale. This keeps database errors out of the normal path.
    const optionIds = await this.getPollOptionIdsOrThrow(quackId);
    if (!optionIds.includes(optionId)) {
      throw new BadRequestException('That answer does not belong to this poll');
    }
    await this.quackRepository.setVote(quackId, user.id, optionId);
    return this.getPollOrThrow(quackId, user.id);
  }

  /** Removes the user's vote. Safe to repeat. */
  async removeVote(user: Identity, quackId: string): Promise<Poll> {
    await this.getPollOptionIdsOrThrow(quackId);
    await this.quackRepository.removeVote(quackId, user.id);
    return this.getPollOrThrow(quackId, user.id);
  }

  private async getPollOptionIdsOrThrow(quackId: string): Promise<string[]> {
    const optionIds = await this.quackRepository.getPollOptionIds(quackId);
    if (optionIds.length === 0) {
      throw new NotFoundException('This quack has no poll');
    }
    return optionIds;
  }

  private async getPollOrThrow(quackId: string, userId: string): Promise<Poll> {
    const poll = await this.quackRepository.getPoll(quackId, userId);
    if (!poll) throw new NotFoundException('This quack has no poll');
    return poll;
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
