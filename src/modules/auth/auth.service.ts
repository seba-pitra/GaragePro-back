import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAuthDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email } = createUserDto;

    const foundUser = await this.userRepository.findOneBy({ email });
    if (foundUser) throw new BadRequestException();

    let { password } = createUserDto;
    password = await this.encryptPassword(password);

    const newUser = this.userRepository.create({ ...createUserDto, password });
    await this.userRepository.save(newUser);

    delete newUser.id;
    delete newUser.password;
    delete newUser.createdAt;

    return {
      user: newUser,
      token: this.getNewToken({ email, password }),
    };
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  private getNewToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private async encryptPassword(password: string) {
    const encryptedPassword = await bcrypt.hash(password, 10);
    return encryptedPassword;
  }
}
