import { QUACK_TEXT_MAX_LENGTH } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Text only: the controller's ValidationPipe forbids unknown properties, so a
// mood or poll sent with a reply is rejected with 400.
export class CreateReplyDto {
  @ApiProperty({
    description: 'Body of the reply',
    example: 'Same here!',
    maxLength: QUACK_TEXT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(QUACK_TEXT_MAX_LENGTH)
  text!: string;
}
