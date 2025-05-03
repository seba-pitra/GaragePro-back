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

    const newUser = this.userRepository.create({ ...createUserDto, password });
    await this.userRepository.save(newUser);

    delete newUser.id;
    delete newUser.password;
    delete newUser.createdAt;

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

  private getNewToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
