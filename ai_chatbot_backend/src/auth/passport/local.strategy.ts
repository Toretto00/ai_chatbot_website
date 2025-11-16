import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    }
    if (!user.is_active) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'ACCOUNT_NOT_ACTIVE',
        message:
          'Your account is not active, please check your email for activation',
      });
    }
    return user;
  }
}
