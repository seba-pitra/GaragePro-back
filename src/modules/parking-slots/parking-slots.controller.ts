import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParkingSlotsService } from './parking-slots.service';
import { CreateParkingSlotDto } from './dto/create-parking-slot.dto';
import { UpdateParkingSlotDto } from './dto/update-parking-slot.dto';

@Controller('parking-slots')
export class ParkingSlotsController {
  constructor(private readonly parkingSlotsService: ParkingSlotsService) {}

  @Post()
  create(@Body() createParkingSlotDto: CreateParkingSlotDto) {
    return this.parkingSlotsService.create(createParkingSlotDto);
  }

  @Get()
  findAll() {
    return this.parkingSlotsService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParkingSlotDto: UpdateParkingSlotDto) {
    return this.parkingSlotsService.update({ id }, updateParkingSlotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parkingSlotsService.remove(+id);
  }
}
