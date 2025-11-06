import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsOptional()
  last_name: string;

  @IsOptional()
  first_name: string;

  @IsOptional()
  middle_name: string;

  @IsOptional()
  name: string;

  @IsOptional()
  phone: string;

  @IsOptional()
  address: string;
}
