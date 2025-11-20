import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  name: string;
}

export class CodeAuthDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  code: string;
}
