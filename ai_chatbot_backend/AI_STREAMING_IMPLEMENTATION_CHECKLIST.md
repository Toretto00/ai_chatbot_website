# AI Streaming Implementation Checklist for NestJS

> **Note**: This checklist adapts Express.js AI streaming patterns to NestJS architecture.

## 📋 Overview

This guide will help you implement AI streaming (OpenAI, Anthropic, etc.) in your NestJS backend using Server-Sent Events (SSE).

---

## ✅ Implementation Steps

### 1. **Install Dependencies** ✅ COMPLETE

- [x] Install Google Generative AI SDK (Gemini):

  ```bash
  # For Google Gemini
  pnpm add @google/generative-ai
  ```

- [x] Add types if needed:
  ```bash
  pnpm add -D @types/node
  ```

**Express vs NestJS**: In Express, you'd directly import these in routes. In NestJS, you'll inject them as services.

---

### 2. **Environment Configuration** ✅ COMPLETE

- [x] Add Gemini API key to `.env`:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_MODEL=gemini-1.5-pro
  ```
- [x] Update `src/config/configuration.ts` to include AI config:
  ```typescript
  export default () => ({
    // ... existing config
    ai: {
      provider: process.env.AI_PROVIDER || 'gemini',
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      },
    },
  });
  ```

---

### 3. **Create Chat Module Structure** ✅ COMPLETE

- [x] Generate module using NestJS CLI:
  ```bash
  cd src/modules
  nest g module chat
  nest g controller chat
  nest g service chat
  ```
- [x] Create DTOs folder: `src/modules/chat/dto/`
- [x] Create entities folder: `src/modules/chat/entities/`

**Express vs NestJS**: Express uses route files. NestJS uses module-based architecture with dependency injection.

---

### 4. **Create Database Tables and Entities** ✅ COMPLETE

- [x] **Run SQL migration to create tables** (see SQL queries below):

  ```sql
  -- Create conversations table
  CREATE TABLE public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title character varying NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
  );

  -- Create messages table
  CREATE TABLE public.messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    role character varying NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    conversation_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
  );

  -- Create indexes for better query performance
  CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
  CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
  CREATE INDEX idx_messages_created_at ON public.messages(created_at);
  ```

- [x] Create `conversation.entity.ts`:

  ```typescript
  import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';

  @Entity('conversations')
  export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'title', type: 'varchar' })
    title: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, (user) => user.conversations)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  ```

- [x] Create `message.entity.ts`:

  ```typescript
  import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Conversation } from './conversation.entity';

  @Entity('messages')
  export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    role: 'user' | 'assistant' | 'system';

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'conversation_id', type: 'uuid' })
    conversationId: string;

    @ManyToOne(() => Conversation, (conversation) => conversation.messages)
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  }
  ```

- [x] Update User entity to include conversations relationship:

  ```typescript
  // Add this to your User entity (user.entity.ts)
  import { OneToMany } from 'typeorm';
  import { Conversation } from '../../chat/entities/conversation.entity';

  // Inside User class:
  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
  ```

---

### 5. **Create DTOs** ✅ COMPLETE

- [x] Create `create-message.dto.ts`:

  ```typescript
  import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

  export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsUUID()
    @IsOptional()
    conversationId?: string;
  }
  ```

- [x] Create `create-conversation.dto.ts`:

  ```typescript
  import { IsString, IsNotEmpty } from 'class-validator';

  export class CreateConversationDto {
    @IsString()
    @IsNotEmpty()
    title: string;
  }
  ```

---

### 6. **Create AI Provider Service (Gemini)** ✅ COMPLETE

- [x] Create `src/modules/chat/ai-provider.service.ts`:

  ```typescript
  import { Injectable } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { GoogleGenerativeAI } from '@google/generative-ai';

  @Injectable()
  export class AiProviderService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
      const apiKey = this.configService.get<string>('ai.gemini.apiKey');
      this.genAI = new GoogleGenerativeAI(apiKey);

      const modelName = this.configService.get<string>('ai.gemini.model');
      this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    async *streamChat(messages: Array<{ role: string; content: string }>) {
      // Convert messages to Gemini format
      // Gemini uses 'user' and 'model' roles (not 'assistant')
      const geminiMessages = messages.map((msg) => ({
        role:
          msg.role === 'assistant'
            ? 'model'
            : msg.role === 'system'
              ? 'user'
              : msg.role,
        parts: [{ text: msg.content }],
      }));

      // Handle system message - prepend to first user message if exists
      const systemMessages = messages.filter((m) => m.role === 'system');
      const systemPrompt =
        systemMessages.length > 0
          ? systemMessages.map((m) => m.content).join('\n') + '\n\n'
          : '';

      // Filter out system messages and add system prompt to first user message
      const filteredMessages = geminiMessages
        .filter((m) => m.role !== 'system')
        .map((msg, idx) => {
          if (idx === 0 && msg.role === 'user' && systemPrompt) {
            return {
              ...msg,
              parts: [{ text: systemPrompt + msg.parts[0].text }],
            };
          }
          return msg;
        });

      // Start chat session
      const chat = this.model.startChat({
        history: filteredMessages.slice(0, -1), // All messages except the last one
      });

      // Get the last message (current user message)
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      const prompt = lastMessage?.parts[0]?.text || '';

      // Stream the response
      const result = await chat.sendMessageStream(prompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    }
  }
  ```

**Express vs NestJS**: Express might have this as a utility function. NestJS uses injectable services with proper DI.

**Gemini API Notes**:

- Gemini uses `user` and `model` roles (not `assistant`)
- System messages should be incorporated into the first user message
- Gemini has excellent streaming support with `sendMessageStream()`

---

### 7. **Implement Chat Service** ✅ COMPLETE

- [x] Update `chat.service.ts`:

  ```typescript
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Conversation } from './entities/conversation.entity';
  import { Message } from './entities/message.entity';
  import { AiProviderService } from './ai-provider.service';
  import { CreateMessageDto } from './dto/create-message.dto';

  @Injectable()
  export class ChatService {
    constructor(
      @InjectRepository(Conversation)
      private conversationRepo: Repository<Conversation>,
      @InjectRepository(Message)
      private messageRepo: Repository<Message>,
      private aiProvider: AiProviderService,
    ) {}

    async createConversation(userId: string, title: string) {
      const conversation = this.conversationRepo.create({
        title,
        user: { id: userId },
      });
      return this.conversationRepo.save(conversation);
    }

    async getConversationHistory(conversationId: string) {
      const messages = await this.messageRepo.find({
        where: { conversation: { id: conversationId } },
        order: { createdAt: 'ASC' },
      });
      return messages;
    }

    async saveMessage(
      conversationId: string,
      role: 'user' | 'assistant',
      content: string,
    ) {
      const message = this.messageRepo.create({
        conversation: { id: conversationId },
        role,
        content,
      });
      return this.messageRepo.save(message);
    }

    async *streamResponse(conversationId: string, userMessage: string) {
      // Save user message
      await this.saveMessage(conversationId, 'user', userMessage);

      // Get conversation history
      const history = await this.getConversationHistory(conversationId);

      // Format for AI
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
    }
  }
  ```

---

### 8. **Implement Streaming Controller** ✅ COMPLETE

- [x] Update `chat.controller.ts` with SSE endpoint:

  ```typescript
  import {
    Controller,
    Post,
    Body,
    Sse,
    MessageEvent,
    UseGuards,
    Req,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { ChatService } from './chat.service';
  import { CreateMessageDto } from './dto/create-message.dto';
  import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
  import { Public } from '../../decorator/customize';

  @Controller('chat')
  export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('conversation')
    @UseGuards(JwtAuthGuard)
    async createConversation(@Req() req, @Body('title') title: string) {
      return this.chatService.createConversation(req.user.id, title);
    }

    @Sse('stream')
    @UseGuards(JwtAuthGuard)
    async streamMessage(
      @Body() createMessageDto: CreateMessageDto,
    ): Promise<Observable<MessageEvent>> {
      const { conversationId, message } = createMessageDto;

      return new Observable((subscriber) => {
        (async () => {
          try {
            for await (const chunk of this.chatService.streamResponse(
              conversationId,
              message,
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
  ```

**Express vs NestJS**:

- Express: Uses `res.setHeader()` and `res.write()` directly
- NestJS: Uses `@Sse()` decorator and Observable/RxJS for streaming

**Alternative approach using Response object**:

```typescript
import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';

@Post('stream')
@UseGuards(JwtAuthGuard)
async streamMessage(
  @Body() createMessageDto: CreateMessageDto,
  @Res() res: Response,
) {
  const { conversationId, message } = createMessageDto;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const chunk of this.chatService.streamResponse(conversationId, message)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
```

---

### 9. **Update Chat Module** ✅ COMPLETE

- [x] Update `chat.module.ts`:

  ```typescript
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { ChatController } from './chat.controller';
  import { ChatService } from './chat.service';
  import { AiProviderService } from './ai-provider.service';
  import { Conversation } from './entities/conversation.entity';
  import { Message } from './entities/message.entity';

  @Module({
    imports: [TypeOrmModule.forFeature([Conversation, Message])],
    controllers: [ChatController],
    providers: [ChatService, AiProviderService],
    exports: [ChatService],
  })
  export class ChatModule {}
  ```

- [x] Import ChatModule in `app.module.ts`

---

### 10. **Add Rate Limiting** ⏸️ OPTIONAL (Not yet implemented)

- [ ] Install throttler:

  ```bash
  pnpm add @nestjs/throttler
  ```

- [ ] Add to app.module.ts:

  ```typescript
  import { ThrottlerModule } from '@nestjs/throttler';

  @Module({
    imports: [
      ThrottlerModule.forRoot([{
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      }]),
      // ... other imports
    ],
  })
  ```

- [ ] Add throttler guard to chat endpoints:

  ```typescript
  import { UseGuards } from '@nestjs/common';
  import { ThrottlerGuard } from '@nestjs/throttler';

  @UseGuards(ThrottlerGuard)
  @Post('stream')
  // ... endpoint implementation
  ```

---

### 11. **CORS Configuration** ✅ COMPLETE (if needed for frontend)

- [ ] Update `main.ts` to allow streaming:

  ```typescript
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection'],
    });

    await app.listen(8000);
  }
  ```

---

### 12. **Frontend Integration Example** ⏸️ READY FOR IMPLEMENTATION

- [ ] Create EventSource client (for your frontend):

  ```typescript
  // Frontend code example
  async function streamChat(
    conversationId: string,
    message: string,
    token: string,
  ) {
    const eventSource = new EventSource(
      `http://localhost:8000/chat/stream?conversationId=${conversationId}&message=${message}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data.content);
      // Update UI with streamed content
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return eventSource;
  }
  ```

**Note**: Native EventSource doesn't support custom headers. For authenticated streaming, consider:

1. Using `fetch` with `ReadableStream`
2. Using libraries like `eventsource` (npm package)
3. Passing token as query parameter (less secure)

**Better approach with fetch**:

```typescript
async function streamChat(
  conversationId: string,
  message: string,
  token: string,
) {
  const response = await fetch('http://localhost:8000/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, message }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Received:', data.content);
        // Update UI
      }
    }
  }
}
```

---

### 13. **Error Handling** ✅ COMPLETE (basic error handling in place)

- [ ] Add global exception filter for streaming errors:

  ```typescript
  // src/filters/streaming-exception.filter.ts
  import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
  } from '@nestjs/common';
  import { Response } from 'express';

  @Catch()
  export class StreamingExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();

      if (response.headersSent) {
        // If streaming has started, send error as SSE
        response.write(
          `data: ${JSON.stringify({ error: exception.message })}\n\n`,
        );
        response.end();
      } else {
        // Normal error response
        const status =
          exception instanceof HttpException ? exception.getStatus() : 500;
        response.status(status).json({
          statusCode: status,
          message: exception.message,
        });
      }
    }
  }
  ```

---

### 14. **Testing** ✅ READY TO TEST

- [x] Test with curl:

  ```bash
  curl -N -H "Authorization: Bearer YOUR_JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -X POST \
       -d '{"conversationId":"uuid-here","message":"Hello AI"}' \
       http://localhost:8000/chat/stream
  ```

- [x] Test conversation creation
- [x] Test message history retrieval
- [x] Test error handling when API fails
- [ ] Test rate limiting (when implemented)

---

## 🔑 Key Differences: Express vs NestJS

| Feature           | Express.js                         | NestJS                                      |
| ----------------- | ---------------------------------- | ------------------------------------------- |
| **Architecture**  | Route-based, imperative            | Module-based, declarative                   |
| **DI**            | Manual dependency management       | Built-in dependency injection               |
| **Streaming**     | `res.write()` directly             | `@Sse()` decorator + Observable or `@Res()` |
| **Configuration** | Manual env loading                 | ConfigService with DI                       |
| **Database**      | Manual setup (e.g., Prisma client) | TypeORM integration with decorators         |
| **Auth**          | Middleware functions               | Guards with decorators                      |
| **Validation**    | Manual or express-validator        | class-validator with DTOs                   |

---

## 📚 Additional Resources

- [NestJS Server-Sent Events](https://docs.nestjs.com/techniques/server-sent-events)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Gemini Streaming Guide](https://ai.google.dev/tutorials/node_quickstart#generate-text-from-text-and-image-input-streaming)
- [TypeORM Relations](https://typeorm.io/relations)
- [Get Gemini API Key](https://makersuite.google.com/app/apikey)

---

## 🎯 Quick Start Commands

```bash
# 1. Install dependencies
cd ai_chatbot_backend
pnpm add @google/generative-ai @nestjs/throttler

# 2. Generate chat module
cd src/modules
nest g module chat
nest g controller chat
nest g service chat

# 3. Create entities and DTOs (manually)

# 4. Run SQL migrations in your Supabase dashboard or using a SQL client

# 5. Start development server
pnpm run dev
```

---

## ✨ Pro Tips

1. **Stream Buffering**: Add a small delay between chunks for better UX
2. **Token Counting**: Track token usage for billing
3. **Context Window**: Implement conversation summarization for long chats
4. **Caching**: Cache frequently asked questions
5. **Monitoring**: Add logging for AI API calls and response times
6. **Retry Logic**: Implement exponential backoff for API failures
7. **Graceful Degradation**: Have fallback responses when AI is unavailable

---

**Happy Streaming! 🚀**
