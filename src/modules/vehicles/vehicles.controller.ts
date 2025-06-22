import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Auth } from '../users/decorators/auth.decorator';
import { ValidRoles } from '../users/interfaces/valid-roles.interface';
import { User } from '../users/entities/user.entity';
import { GetUser } from '../users/decorators/get-user.decorator';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  create(@GetUser() user: User, @Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(user, createVehicleDto);
  }

  @Get()
  @Auth(ValidRoles.employee, ValidRoles.employee, ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.vehiclesService.findAll(paginationDto);
  }

  @Get('/user/:email')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  findByUserId(@Param('email') email: string, @Query() paginationDto: PaginationDto) {
    return this.vehiclesService.findByUserEmail(email, paginationDto);
  }

  @Get(':id')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.customer, ValidRoles.employee, ValidRoles.admin)
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':plateNumber')
  @Auth(ValidRoles.customer, ValidRoles.admin)
  remove(@Param('plateNumber') plateNumber: string) {
    return this.vehiclesService.remove(plateNumber);
  }
}
