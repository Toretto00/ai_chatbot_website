import {
  IsNotEmpty,
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  account_type?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be either ADMIN or USER' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  code_id?: string;

  @IsOptional()
  code_expire?: Date;
}
