import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Sse,
  MessageEvent,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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

  // Stream chat messages (Server-Sent Events)
  @Sse('stream')
  async streamMessage(
    @Req() req,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<Observable<MessageEvent>> {
    const { conversationId, message } = createMessageDto;

    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.chatService.streamResponse(
            conversationId,
            message,
            req.user.userId,
          )) {
            subscriber.next({
              data: { content: chunk },
            } as MessageEvent);
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }
}
