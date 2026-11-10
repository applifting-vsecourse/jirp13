import { Poll } from '@/modules/quack/domain/poll';
import { Quack, QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class PollOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'Number of votes for this answer' })
  votes!: number;
}

export class PollDto {
  @ApiProperty({ type: [PollOptionDto], description: 'In display order' })
  options!: PollOptionDto[];

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "The signed-in user's chosen answer, if any",
  })
  myVoteOptionId!: string | null;
}

export class ReplyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  static fromDomain(reply: Quack): ReplyResponseDto {
    if (reply.text === null || reply.userId === null || !reply.user) {
      throw new Error(
        `ReplyResponseDto.fromDomain expected a live reply with its author loaded for quack ${reply.id}`,
      );
    }
    return {
      id: reply.id,
      text: reply.text,
      userId: reply.userId,
      createdAt: reply.createdAt,
      user: {
        id: reply.user.id,
        name: reply.user.name,
        username: reply.user.username,
      },
    };
  }
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when the quack was deleted (placeholder)',
  })
  text!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true, type: String })
  mood!: QuackMood | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when the quack was deleted (placeholder)',
  })
  userId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description: 'Null when the quack was deleted (placeholder)',
  })
  user!: QuackUserDto | null;

  @ApiProperty({
    type: PollDto,
    nullable: true,
    description: 'The attached poll, or null when the quack has none',
  })
  poll!: Poll | null;

  @ApiProperty({
    description:
      'True when the author or an admin deleted this quack but replies keep it in the feed. Its content is gone.',
  })
  deleted!: boolean;

  @ApiProperty({ type: [ReplyResponseDto], description: 'Oldest first' })
  replies!: ReplyResponseDto[];

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.deleted && !quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    // A placeholder exposes nothing but its id, time and replies.
    const live = !quack.deleted;
    return {
      id: quack.id,
      text: live ? quack.text : null,
      mood: live ? quack.mood : null,
      userId: live ? quack.userId : null,
      createdAt: quack.createdAt,
      user:
        live && quack.user
          ? {
              id: quack.user.id,
              name: quack.user.name,
              username: quack.user.username,
            }
          : null,
      poll: live ? quack.poll : null,
      deleted: quack.deleted,
      replies: quack.replies.map(ReplyResponseDto.fromDomain),
    };
  }
}
