import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from '@nestjs/common';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '@decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  @ResponseMessage('Login')
  signIn(@Request() request: any) {
    return this.authService.login(request.user);
  }

  @Post('register')
  @Public()
  @ResponseMessage('Register')
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @Public()
  @ResponseMessage('Verify Email')
  verifyEmail(@Body() verifyEmailDto: CodeAuthDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Get('send-email')
  @Public()
  sendEmail() {
    this.mailerService
      .sendMail({
        to: 'phanchibao007@gmail.com', // list of receivers
        // from: 'noreply@nestjs.com', // sender address
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: 'welcome', // plaintext body
        template: 'register',
        context: {
          name: 'Phan Chi Bao',
          activationCode: '123456',
        },
      })
      .then(() => {})
      .catch(() => {});
    return 'ok';
  }
}
