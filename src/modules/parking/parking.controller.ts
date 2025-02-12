import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { ValidRoles } from '../auth/interfaces/valid-roles.interface';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UnoccupyReservationDto } from './dto/unoccupy-reservation.dto';
import { CreateTotalCostDto } from './dto/create-total-cost.dto';

@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post('/reserve')
  @Auth(ValidRoles.customer, ValidRoles.admin)
  create(@GetUser() user: User, @Body() createReservationDto: CreateReservationDto) {
    return this.parkingService.create(user, createReservationDto);
  }

  @Post('/create-total-cost/:id')
  @Auth(ValidRoles.employee, ValidRoles.admin)
  createTotalCost(@Param('id') id: string, @Body() createTotalCostDto: CreateTotalCostDto) {
    return this.parkingService.createTotalCost(id, createTotalCostDto);
  }

  @Get()
  @Auth(ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.parkingService.findAll(paginationDto);
  }

  @Get(':id')
  @Auth(ValidRoles.admin)
  findOne(@Param('id') id: string) {
    return this.parkingService.findOne(id);
  }

  @Patch('/unoccupy/:id')
  @Auth(ValidRoles.customer, ValidRoles.admin)
  unoccupy(@Param('id') id: string, @Body() unoccupyReservationDto: UnoccupyReservationDto) {
    return this.parkingService.unoccupy(id, unoccupyReservationDto);
  }
}
