import { Poll } from '@/modules/quack/domain/poll';

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

// Maximum length of a quack's or reply's text.
export const QUACK_TEXT_MAX_LENGTH = 280;

// A deleted quack that still has replies is kept as a placeholder: `deleted`
// is true and its text, mood, author and poll are gone (see ADR 0001).
export type Quack = {
  id: string;
  // null only on a placeholder
  text: string | null;
  mood: QuackMood | null;
  // null only on a placeholder
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  // null when the quack has no poll
  poll: Poll | null;
  // set when this quack is a reply
  parentId: string | null;
  deleted: boolean;
  // oldest first; empty on a reply (replies are one level deep)
  replies: Quack[];
};
