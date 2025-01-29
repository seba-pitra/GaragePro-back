import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [AuthModule, ReservationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
