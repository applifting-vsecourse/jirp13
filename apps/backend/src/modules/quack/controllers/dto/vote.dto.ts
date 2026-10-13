import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({
    description: 'Id of the poll answer to vote for',
    example: 'cm9x0y1z20000abcd1234efgh',
  })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
