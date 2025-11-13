import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsUUID()
  @IsOptional()
  conversationId?: string;
}

