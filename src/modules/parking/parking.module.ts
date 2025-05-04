import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { Reservation } from './entities/reservation.entity';
import { ReservationSlot } from './entities/reservation-slot.entity';
import { ParkingSlotsModule } from '../parking-slots/parking-slots.module';
import { UserModule } from '../users/user.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationSlot, User]),
    UserModule,
    ParkingSlotsModule,
  ],
  controllers: [ParkingController],
  providers: [ParkingService],
  exports: [ParkingService],
})
export class ParkingModule {}
