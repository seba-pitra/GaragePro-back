import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envConfiguration } from './config/env.config';

import { AuthModule } from './modules/auth/auth.module';
import { joiValidationSchema } from './config/joi.validation';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { Reservation } from './modules/reservations/entities/reservation.entity';
import { User } from './modules/auth/entities/auth.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [envConfiguration],
      validationSchema: joiValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          entities: [User, Reservation],
          synchronize: true,
        };
      },
    }),

    AuthModule,

    ReservationsModule,
  ],
})
export class AppModule {}
