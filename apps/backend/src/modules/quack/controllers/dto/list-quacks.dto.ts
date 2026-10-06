import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListQuacksDto {
  @ApiPropertyOptional({
    description:
      'Filter quacks whose text or author name/username contains this value (case-insensitive)',
    example: 'quack',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
