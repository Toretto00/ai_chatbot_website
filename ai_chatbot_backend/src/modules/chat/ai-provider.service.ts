import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiProviderService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.gemini.apiKey') || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    const modelName =
      this.configService.get<string>('ai.gemini.model') || 'gemini-pro';

    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async *streamChat(messages: Array<{ role: string; content: string }>) {
    try {
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
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error(`Gemini API failed: ${error.message || 'Unknown error'}`);
    }
  }
}
