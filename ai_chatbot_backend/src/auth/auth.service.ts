import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CreateAuthDto } from './dto/create-auth.dto';
// import { UpdateAuthDto } from './dto/update-auth.dto';
import { UsersService } from '../modules/users/users.service';
import { comparePasswordHelper } from '@helpers/util';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    const isPasswordValid = await comparePasswordHelper(
      pass,
      user?.password || '',
    );

    if (!user || !isPasswordValid) return null;

    return user;
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user.id };
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: CreateAuthDto) {
    return this.usersService.register(registerDto);
  }
}
