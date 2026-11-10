import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateQuackDto } from './dto/create-quack.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListQuacksDto } from './dto/list-quacks.dto';
import {
  PollDto,
  QuackResponseDto,
  ReplyResponseDto,
} from './dto/quack.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({ summary: 'List all quacks, optionally filtered by search' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(
      user,
      query.search,
      query.mine,
    );
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid quack or poll answers' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      pollOptions: body.pollOptions,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Post(':quackId/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reply to a quack',
    description:
      'Replies are text only and one level deep. A quack that was deleted but still has replies can be replied to.',
  })
  @ApiResponse({ status: 201, type: ReplyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid text, or the target is itself a reply',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async reply(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    const reply = await this.quacksService.createReply(
      user,
      quackId,
      body.text,
    );
    return ReplyResponseDto.fromDomain(reply);
  }

  @Delete(':quackId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quack or reply (author or admin)',
    description:
      'A quack that still has replies is kept as a content-free placeholder so the replies survive; otherwise it is removed.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Quack belongs to someone else' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async remove(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<void> {
    await this.quacksService.deleteQuack(user, quackId);
  }

  @Put(':quackId/vote')
  @ApiOperation({
    summary: "Set the signed-in user's vote on a quack's poll",
    description:
      'Casts the vote, or moves it to another answer. Repeating the same request changes nothing.',
  })
  @ApiResponse({ status: 200, type: PollDto })
  @ApiResponse({ status: 400, description: 'Answer is not part of this poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or has no poll' })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: VoteDto,
  ): Promise<PollDto> {
    return this.quacksService.vote(user, quackId, body.optionId);
  }

  @Delete(':quackId/vote')
  @ApiOperation({
    summary: "Remove the signed-in user's vote on a quack's poll",
    description: 'Succeeds even when the user has not voted.',
  })
  @ApiResponse({ status: 200, type: PollDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or has no poll' })
  async removeVote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<PollDto> {
    return this.quacksService.removeVote(user, quackId);
  }
}
