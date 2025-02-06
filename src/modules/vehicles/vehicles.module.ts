import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { Vehicle } from './entities/vehicle.entity';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Vehicle, User])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
