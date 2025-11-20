import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import { CodeAuthDto, CreateAuthDto } from '@auth/dto/create-auth.dto';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  async isEmailExists(email: string): Promise<boolean> {
    const exists = await this.userRepository.exists({ where: { email } });
    return exists;
  }

  async create(createUserDto: CreateUserDto) {
    const {
      email,
      password,
      last_name,
      first_name,
      middle_name,
      name,
      phone,
      address,
    } = createUserDto;

    const isEmailExists = await this.isEmailExists(email);
    if (isEmailExists) {
      throw new BadRequestException(`Email ${email} already exists`);
    }

    const hashedPassword = await hashPasswordHelper(password);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      last_name,
      first_name,
      middle_name,
      name,
      phone,
      address,
    });
    await this.userRepository.save(user);
    return {
      message: 'User created successfully',
      id: user.id,
      statusCode: 201,
    };
  }

  async findAll(
    query: string,
    current: number,
    pageSize: number,
  ): Promise<{
    message: string;
    meta: {
      current: number;
      pageSize: number;
      pages: number;
      total: number;
    };
    data: User[];
    statusCode: number;
  }> {
    try {
      const { filter, sort } = aqp(query);

      if (filter.current) delete filter.current;
      if (filter.pageSize) delete filter.pageSize;

      if (!current) current = 1;
      if (!pageSize) pageSize = 10;

      const skip = (current - 1) * pageSize;

      const totalItems = await this.userRepository.count({ where: filter });

      const totalPages = Math.ceil(totalItems / pageSize);

      const listUsers = await this.userRepository.find({
        where: filter,
        order: sort || { created_at: 'DESC' },
        skip,
        take: pageSize,
      });

      return {
        message:
          totalItems === 0 ? 'No users found' : `${totalItems} users found`,
        data: listUsers,
        meta: {
          current,
          pageSize,
          pages: totalPages,
          total: totalItems,
        },
        statusCode: totalItems === 0 ? 404 : 200,
      };
    } catch (error) {
      return {
        message: 'Failed to get users',
        data: [],
        meta: {
          current: 0,
          pageSize: 0,
          pages: 0,
          total: 0,
        },
        statusCode: 500,
      };
    }
  }

  async findOne(
    id: string,
  ): Promise<{ message: string; data: User | null; statusCode: number }> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        return {
          message: 'User not found',
          data: null,
          statusCode: 404,
        };
      }
      return {
        message: 'User found',
        data: user,
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: 'Failed to get user',
        data: null,
        statusCode: 500,
      };
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.update(
        { id: updateUserDto.id },
        { ...updateUserDto },
      );
      if (user.affected === 0) {
        return {
          message: 'User not found',
          statusCode: 404,
        };
      }
      return {
        message: 'User updated successfully',
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: 'Failed to update user',
        statusCode: 500,
      };
    }
  }

  async remove(id: string) {
    try {
      const user = await this.userRepository.delete(id);
      if (user.affected === 0) {
        return {
          message: 'User not found',
          statusCode: 404,
        };
      }
      return {
        message: 'User deleted successfully',
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: 'Failed to delete user',
        statusCode: 500,
      };
    }
  }

  async register(registerDto: CreateAuthDto) {
    const { email, password, name } = registerDto;

    const isEmailExists = await this.isEmailExists(email);
    if (isEmailExists) {
      throw new BadRequestException(`Email ${email} already exists`);
    }

    const hashedPassword = await hashPasswordHelper(password);

    const code_id = String(Math.floor(Math.random() * 1000000)).padStart(
      6,
      '0',
    );
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      is_active: false,
      code_id,
      code_expire: dayjs().add(1, 'day'),
    });
    await this.userRepository.save(user);

    this.mailerService
      .sendMail({
        to: user.email,
        subject: 'Activate your account',
        template: 'register',
        context: {
          name: user.name,
          activationCode: code_id,
        },
      })
      .then(() => {})
      .catch(() => {});

    return {
      message: 'User created successfully',
      id: user.id,
      statusCode: 201,
    };
  }

  async handleActivateAccount(verifyEmailDto: CodeAuthDto) {
    const { user_id, code } = verifyEmailDto;
    const user = await this.userRepository.findOne({ where: { id: user_id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.code_id !== code) {
      throw new BadRequestException('Invalid code');
    }
    if (user.code_expire.getTime() < dayjs().toDate().getTime()) {
      throw new BadRequestException('Code expired');
    }
    await this.userRepository.update(user_id, { is_active: true });
    return {
      message: 'Account activated successfully',
      statusCode: 200,
      data: user.id,
    };
  }
}
