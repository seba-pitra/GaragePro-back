import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { ValidRoles } from '../auth/interfaces/valid-roles.interface';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UnoccupyReservationDto } from './dto/unoccupy-reservation.dto';

@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post('/reserve')
  @Auth(ValidRoles.customer, ValidRoles.admin)
  create(@GetUser() user: User, @Body() createReservationDto: CreateReservationDto) {
    return this.parkingService.create(user, createReservationDto);
  }

  @Get()
  @Auth(ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.parkingService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parkingService.findOne(id);
  }

  @Patch('/unoccupy/:id')
  update(@Param('id') id: string, @Body() unoccupyReservationDto: UnoccupyReservationDto) {
    return this.parkingService.update(id, unoccupyReservationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parkingService.remove(+id);
  }
}
