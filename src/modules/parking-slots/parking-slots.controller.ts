import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParkingSlotsService } from './parking-slots.service';
import { CreateParkingSlotDto } from './dto/create-parking-slot.dto';
import { UpdateParkingSlotDto } from './dto/update-parking-slot.dto';
import { ValidRoles } from '../users/interfaces/valid-roles.interface';
import { Auth } from '../users/decorators/auth.decorator';

@Controller('parking-slots')
export class ParkingSlotsController {
  constructor(private readonly parkingSlotsService: ParkingSlotsService) {}

  @Post()
  @Auth(ValidRoles.employee, ValidRoles.employee, ValidRoles.admin)
  create(@Body() createParkingSlotDto: CreateParkingSlotDto) {
    return this.parkingSlotsService.create(createParkingSlotDto);
  }

  @Get()
  @Auth(ValidRoles.employee, ValidRoles.employee, ValidRoles.admin)
  findAll() {
    return this.parkingSlotsService.findAll();
  }

  @Patch(':id')
  @Auth(ValidRoles.admin)
  update(@Param('id') id: string, @Body() updateParkingSlotDto: UpdateParkingSlotDto) {
    return this.parkingSlotsService.update({ id }, updateParkingSlotDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin)
  remove(@Param('id') id: string) {
    return this.parkingSlotsService.remove(+id);
  }
}
