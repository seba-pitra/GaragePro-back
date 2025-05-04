import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { comparePasswords, encryptPassword } from '@/utils/encrypt';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { getPropsToDatabase } from '@/utils/getPropsToDatabase';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email } = createUserDto;

    const foundUser = await this.userRepository.findOneBy({ email });
    if (foundUser) throw new BadRequestException(`User already exists with email: ${email}`);

    let { password } = createUserDto;
    password = await encryptPassword(password);

    const propsToCreate = getPropsToDatabase(createUserDto);

    const newUser = this.userRepository.create({ ...propsToCreate, password });
    await this.userRepository.save(newUser);

    delete newUser.id;
    delete newUser.password;
    delete newUser.created_at;

    return {
      user: newUser,
      token: this.getNewToken({ email }),
    };
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true },
    });
    if (!user) throw new NotFoundException(`User not found with email: ${email}`);

    const passwordMatch = await comparePasswords(password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Password is not correct');

    delete user.password;

    return {
      user,
      token: this.getNewToken({ email }),
    };
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const users = await this.userRepository.find({
      where: { is_active: true },
      select: {
        id: false,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        roles: true,
        is_active: true,
      },
      skip: offset,
      take: limit,
    });

    return { users, total: users.length };
  }

  async findOneByEmail(email: string) {
    const user = await this.userRepository.findOneBy({ email });

    if (!user) {
      throw new NotFoundException(`User not found with email: ${email}`);
    }

    return { user };
  }

  async update(email: string, updateUserDto: Partial<CreateUserDto>) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new NotFoundException(`User not found with email: ${email}`);
    const { id } = user;

    const propsToUpdate = getPropsToDatabase(updateUserDto);

    if (propsToUpdate.password) {
      propsToUpdate.password = await encryptPassword(propsToUpdate.password);
    }

    await this.userRepository.update(id, propsToUpdate);

    const updatedUser = await this.userRepository.findOneBy({ id: id });
    delete updatedUser.password;

    return updatedUser;
  }

  async delete(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new NotFoundException(`User not found with email: ${email}`);
    const { id } = user;

    await this.userRepository.update(id, {
      is_active: false,
    });

    user.is_active = false;

    return user;
  }

  private getNewToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
