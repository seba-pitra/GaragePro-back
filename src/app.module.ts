import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ReservationsModule } from './modules/reservations/reservations.module';

@Module({
    imports: [AuthModule, ReservationsModule],
})
export class AppModule {}
