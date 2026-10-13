export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_OPTION_MAX_LENGTH = 50;

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  options: PollOption[];
  totalVotes: number;
  myVoteOptionId: string | null;
};

/**
 * Key used to reject duplicate answers: "Pizza  Place" and "pizza place" collide.
 * Stored in PollOption.textKey, which has a unique index per quack.
 */
export const pollOptionKey = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
