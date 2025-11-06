import { IsNotEmpty, IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  last_name: string;
  first_name: string;
  middle_name: string;
  name: string;
  avatar_url: string;
  phone: string;
  address: string;
  account_type: string;
  role: string;
  code_id: string;
  code_expire: Date;
}
