import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
