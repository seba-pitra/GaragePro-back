import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { envConfiguration } from './config/env.config';
import { UserModule } from './modules/users/user.module';
import { joiValidationSchema } from './config/joi.validation';
import { User } from './modules/users/entities/user.entity';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { Vehicle } from './modules/vehicles/entities/vehicle.entity';
import { Reservation } from './modules/parking/entities/reservation.entity';
import { ReservationSlot } from './modules/parking/entities/reservation-slot.entity';
import { ParkingModule } from './modules/parking/parking.module';
import { ParkingSlotsModule } from './modules/parking-slots/parking-slots.module';
import { ParkingSlot } from './modules/parking-slots/entities/parking-slot.entity';

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
          entities: [User, Reservation, Vehicle, Reservation, ReservationSlot, ParkingSlot],
          synchronize: true,
        };
      },
    }),

    UserModule,

    VehiclesModule,

    ParkingModule,

    ParkingSlotsModule,
  ],
})
export class AppModule {}
