import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AiProviderService } from './ai-provider.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private aiProvider: AiProviderService,
  ) {}

  // Create a new conversation
  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ) {
    const conversation = this.conversationRepo.create({
      title: createConversationDto.title,
      user: { id: userId } as any,
    });

    return this.conversationRepo.save(conversation);
  }

  // Get all conversations for a user
  async getUserConversations(userId: string) {
    return this.conversationRepo.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
  }

  // Get a single conversation with messages
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, user: { id: userId } },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // Get conversation history (messages only)
  async getConversationHistory(conversationId: string) {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
    });
    return messages;
  }

  // Save a message to the database
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ) {
    const message = this.messageRepo.create({
      conversation: { id: conversationId } as any,
      role,
      content,
    });
    return this.messageRepo.save(message);
  }

  // Stream AI response
  async *streamResponse(
    conversationId: string,
    userMessage: string,
    userId: string,
  ) {
    // Verify conversation belongs to user
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, user: { id: userId } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Save user message
    await this.saveMessage(conversationId, 'user', userMessage);

    // Get conversation history
    const history = await this.getConversationHistory(conversationId);

    // Format messages for AI
    const messages = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Stream AI response
    let fullResponse = '';
    for await (const chunk of this.aiProvider.streamChat(messages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Save assistant message
    await this.saveMessage(conversationId, 'assistant', fullResponse);

    // Update conversation updated_at timestamp
    conversation.updatedAt = new Date();
    await this.conversationRepo.save(conversation);
  }

  // Delete a conversation
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, user: { id: userId } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.conversationRepo.remove(conversation);
    return { message: 'Conversation deleted successfully' };
  }
}
