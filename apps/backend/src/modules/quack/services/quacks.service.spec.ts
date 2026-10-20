// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

const viewer = { id: 'u1' } as Identity;

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(viewer)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith(
      'u1',
      undefined,
      undefined,
    );
  });

  it('passes the search term through to the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(viewer, 'quack')).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', 'quack', undefined);
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: null,
      pollOptions: undefined,
      userId: 'u1',
    });
  });

  it('passes the chosen mood through to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'honk', mood: 'silly' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'honk', mood: 'silly' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'honk',
      mood: 'silly',
      pollOptions: undefined,
      userId: 'u1',
    });
  });

  describe('polls', () => {
    const create = (
      pollOptions?: string[],
    ): {
      repository: ReturnType<typeof mock<QuackRepository>>;
      result: Promise<Quack>;
    } => {
      const repository = mock<QuackRepository>();
      repository.createQuack.mockResolvedValue(aQuack());
      const service = new QuacksService(repository);
      return {
        repository,
        result: service.createQuack(viewer, { text: 'lunch?', pollOptions }),
      };
    };

    it('creates a poll with trimmed answers in the given order', async () => {
      const { repository, result } = create(['  West bank ', 'The  reeds']);

      await result;
      expect(repository.createQuack).toHaveBeenCalledWith({
        text: 'lunch?',
        mood: null,
        userId: 'u1',
        pollOptions: [
          { text: 'West bank', textKey: 'west bank' },
          { text: 'The  reeds', textKey: 'the reeds' },
        ],
      });
    });

    it('accepts the largest allowed poll', async () => {
      const { result } = create(['a', 'b', 'c', 'd', 'e', 'f']);
      await expect(result).resolves.toBeDefined();
    });

    it('creates no poll when no answers are given', async () => {
      const { repository, result } = create(undefined);

      await result;
      expect(repository.createQuack).toHaveBeenCalledWith(
        expect.objectContaining({ pollOptions: undefined }),
      );
    });

    it.each([
      ['fewer than 2 answers', ['only one']],
      ['more than 6 answers', ['a', 'b', 'c', 'd', 'e', 'f', 'g']],
      ['an empty answer', ['yes', '   ']],
      ['duplicates that differ only by case', ['Pizza', 'pizza']],
      [
        'duplicates that differ only by whitespace',
        ['Pizza place', ' pizza  PLACE '],
      ],
    ])('rejects %s', async (_name, answers) => {
      const { repository, result } = create(answers);

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createQuack).not.toHaveBeenCalled();
    });
  });

  describe('voting', () => {
    const poll: Poll = {
      options: [
        { id: 'o1', text: 'West bank', votes: 1 },
        { id: 'o2', text: 'The reeds', votes: 0 },
      ],
      totalVotes: 1,
      myVoteOptionId: 'o1',
    };
    const setup = (): {
      repository: ReturnType<typeof mock<QuackRepository>>;
      service: QuacksService;
    } => {
      const repository = mock<QuackRepository>();
      repository.getPollOptionIds.mockResolvedValue(['o1', 'o2']);
      repository.getPoll.mockResolvedValue(poll);
      return { repository, service: new QuacksService(repository) };
    };

    it("records the signed-in user's vote and returns the poll", async () => {
      const { repository, service } = setup();

      await expect(service.vote(viewer, 'q1', 'o1')).resolves.toEqual(poll);
      // the voter comes from the session, never from the request
      expect(repository.setVote).toHaveBeenCalledWith('q1', 'u1', 'o1');
      expect(repository.getPoll).toHaveBeenCalledWith('q1', 'u1');
    });

    it("rejects an answer that is not part of the quack's poll", async () => {
      const { repository, service } = setup();

      await expect(service.vote(viewer, 'q1', 'other')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.setVote).not.toHaveBeenCalled();
    });

    it('answers 404 when voting on a quack without a poll', async () => {
      const { repository, service } = setup();
      repository.getPollOptionIds.mockResolvedValue([]);

      await expect(service.vote(viewer, 'q1', 'o1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.setVote).not.toHaveBeenCalled();
    });

    it('removes the vote and returns the poll', async () => {
      const { repository, service } = setup();

      await expect(service.removeVote(viewer, 'q1')).resolves.toEqual(poll);
      expect(repository.removeVote).toHaveBeenCalledWith('q1', 'u1');
    });

    it('answers 404 when removing a vote on a quack without a poll', async () => {
      const { repository, service } = setup();
      repository.getPollOptionIds.mockResolvedValue([]);

      await expect(service.removeVote(viewer, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.removeVote).not.toHaveBeenCalled();
    });
  });

  describe('deleteQuack', () => {
    it('deletes the quack of its author', async () => {
      const repository = mock<QuackRepository>();
      repository.getAuthorId.mockResolvedValue('u1');
      const service = new QuacksService(repository);

      await service.deleteQuack(viewer, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'u1');
    });

    it("refuses to delete someone else's quack", async () => {
      const repository = mock<QuackRepository>();
      repository.getAuthorId.mockResolvedValue('u2');
      const service = new QuacksService(repository);

      await expect(service.deleteQuack(viewer, 'q1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('reports a missing quack', async () => {
      const repository = mock<QuackRepository>();
      repository.getAuthorId.mockResolvedValue(null);
      const service = new QuacksService(repository);

      await expect(service.deleteQuack(viewer, 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
