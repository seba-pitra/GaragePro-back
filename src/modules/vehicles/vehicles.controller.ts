import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ValidRoles } from '../auth/interfaces/valid-roles.interface';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Auth(ValidRoles.customer)
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @Auth(ValidRoles.employee, ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.vehiclesService.findAll(paginationDto);
  }

  @Get('/user/:userId')
  @Auth(ValidRoles.customer)
  findByUserId(@Param('userId') userId: string, @Query() paginationDto: PaginationDto) {
    return this.vehiclesService.findByUserId(userId, paginationDto);
  }

  @Get(':id')
  @Auth(ValidRoles.customer)
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.customer)
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.customer)
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
