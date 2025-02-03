import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('jwtSecretToken'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(jwtPayload: JwtPayload) {
    const { email, password } = jwtPayload;

    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new UnauthorizedException();

    const passwordMatch = await this.comparePasswords(password, user.password);
    if (!passwordMatch) throw new UnauthorizedException();

    return user;
  }

  private async comparePasswords(requestPassword: string, userPassword: string) {
    const match = await bcrypt.compare(requestPassword, userPassword);
    return match;
  }
}
