import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParkingService } from '../parking/parking.service';

@Injectable()
export class TasksService {
  constructor(private readonly parkingService: ParkingService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async everyTenMinutes() {
    await this.parkingService.checkExpiredReservationsAndUpdateStatus();
  }
}
