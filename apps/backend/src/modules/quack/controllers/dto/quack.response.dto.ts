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

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true, type: String })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({
    type: PollDto,
    nullable: true,
    description: 'The attached poll, or null when the quack has none',
  })
  poll!: Poll | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      poll: quack.poll,
    };
  }
}
