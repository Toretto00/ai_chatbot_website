import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}
