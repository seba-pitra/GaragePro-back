import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UnoccupyReservationDto } from './dto/unoccupy-reservation.dto';
import { CreateTotalCostDto } from './dto/create-total-cost.dto';
import { ValidRoles } from '../users/interfaces/valid-roles.interface';
import { Auth } from '../users/decorators/auth.decorator';
import { User } from '../users/entities/user.entity';
import { GetUser } from '../users/decorators/get-user.decorator';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post('/reserve')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  reserve(@GetUser() user: User, @Body() createReservationDto: CreateReservationDto) {
    return this.parkingService.reserve(user, createReservationDto);
  }

  @Post('/create-total-cost/:id')
  @Auth(ValidRoles.employee, ValidRoles.employee, ValidRoles.admin)
  createTotalCost(@Param('id') id: string, @Body() createTotalCostDto: CreateTotalCostDto) {
    return this.parkingService.createTotalCost(id, createTotalCostDto);
  }

  @Get()
  @Auth(ValidRoles.employee, ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.parkingService.findAll(paginationDto);
  }

  @Get(':id')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  findOne(@Param('id') id: string) {
    return this.parkingService.findOneReservationSlot(id);
  }

  @Patch('/:id')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {
    return this.parkingService.update(id, updateReservationDto);
  }

  @Patch('/unoccupy/:id')
  @Auth(ValidRoles.customer, ValidRoles.admin)
  unoccupy(@Param('id') id: string, @Body() unoccupyReservationDto: UnoccupyReservationDto) {
    return this.parkingService.unoccupy(id, unoccupyReservationDto);
  }
}
