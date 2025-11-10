import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CreateAuthDto } from './dto/create-auth.dto';
// import { UpdateAuthDto } from './dto/update-auth.dto';
import { UsersService } from '../users/users.service';
import { comparePasswordHelper } from '@helpers/util';
import { JwtService } from '@nestjs/jwt';

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
      access_token: this.jwtService.sign(payload),
    };
  }

  // async signIn(username: string, pass: string): Promise<any> {
  //   const user = await this.usersService.findByEmail(username);
  //   const isPasswordValid = await comparePasswordHelper(
  //     pass,
  //     user?.password || '',
  //   );
  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException();
  //   }
  //   const payload = { sub: user?.id, username: user?.email };
  //   return {
  //     access_token: await this.jwtService.signAsync(payload),
  //   };
  // }
  // create(createAuthDto: CreateAuthDto) {
  //   return 'This action adds a new auth';
  // }

  // findAll() {
  //   return `This action returns all auth`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} auth`;
  // }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
