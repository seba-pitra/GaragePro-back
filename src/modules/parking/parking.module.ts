import { Module } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationSlot } from './entities/reservation-slot.entity';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { ParkingSlotsModule } from '../parking-slots/parking-slots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationSlot, User]),
    AuthModule,
    ParkingSlotsModule,
  ],
  controllers: [ParkingController],
  providers: [ParkingService],
})
export class ParkingModule {}
