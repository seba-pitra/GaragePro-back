import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ParkingModule } from '../parking/parking.module';

@Module({
  imports: [ScheduleModule.forRoot(), ParkingModule],
  providers: [TasksService],
})
export class TasksModule {}
