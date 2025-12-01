import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Create a new conversation
  @Post('conversation')
  async createConversation(
    @Req() req,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    console.log('User from JWT:', req.user);
    console.log('User ID:', req.user?.userId);

    if (!req.user?.userId) {
      throw new Error('User ID not found in JWT token');
    }

    return this.chatService.createConversation(
      req.user.userId,
      createConversationDto,
    );
  }

  // Get all user conversations
  @Get('conversations')
  async getUserConversations(@Req() req) {
    return this.chatService.getUserConversations(req.user.userId);
  }

  // Get a specific conversation with messages
  @Get('conversation/:id')
  async getConversation(@Req() req, @Param('id') conversationId: string) {
    return this.chatService.getConversation(conversationId, req.user.userId);
  }

  // Delete a conversation
  @Delete('conversation/:id')
  async deleteConversation(@Req() req, @Param('id') conversationId: string) {
    return this.chatService.deleteConversation(conversationId, req.user.userId);
  }

  // Stream chat messages (chunked)
  @Post('stream')
  async streamMessage(
    @Req() req,
    @Body() createMessageDto: CreateMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const { conversationId, message } = createMessageDto;

    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    let clientClosed = false;
    req.on('close', () => {
      clientClosed = true;
    });

    const pushChunk = (payload: object) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      (res as any).flush?.();
    };

    try {
      for await (const chunk of this.chatService.streamResponse(
        conversationId,
        message,
        req.user.userId,
      )) {
        if (clientClosed) break;
        pushChunk({ content: chunk });
      }
      pushChunk({ done: true });
    } catch (error) {
      pushChunk({
        error: error instanceof Error ? error.message : 'Stream error',
      });
    } finally {
      res.end();
    }
  }
}
