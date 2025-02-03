import * as bcrypt from 'bcrypt';
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

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new NotFoundException();

    const passwordMatch = await this.comparePasswords(password, user.password);
    if (!passwordMatch) throw new UnauthorizedException();

    delete user.id;
    delete user.password;
    delete user.createdAt;

    return {
      user,
      token: this.getNewToken({ email, password }),
    };
  }

  private getNewToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private async comparePasswords(requestPassword: string, userPassword: string) {
    const match = await bcrypt.compare(requestPassword, userPassword);
    return match;
  }

  private async encryptPassword(password: string) {
    const encryptedPassword = await bcrypt.hash(password, 10);
    return encryptedPassword;
  }
}
