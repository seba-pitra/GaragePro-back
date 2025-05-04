import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParkingSlotDto } from './dto/create-parking-slot.dto';
import { UpdateParkingSlotDto } from './dto/update-parking-slot.dto';
import { ParkingSlot } from './entities/parking-slot.entity';
import { getPropsToUpdate } from '@/utils/getPropsToUpdate';

@Injectable()
export class ParkingSlotsService {
  constructor(
    @InjectRepository(ParkingSlot)
    private readonly parkingSlotRepository: Repository<ParkingSlot>,
  ) {}

  async create(createParkingSlotDto: CreateParkingSlotDto) {
    const { slotCode } = createParkingSlotDto;

    const data = { slot_code: slotCode };

    const newSlot = this.parkingSlotRepository.create(data);
    await this.parkingSlotRepository.save(newSlot);

    return newSlot;
  }

  findAll() {
    return `This action returns all parkingSlots`;
  }

  async findOneBySlotCode(slotCode: string) {
    const slot = await this.parkingSlotRepository.findOneBy({ slot_code: slotCode });

    if (!slot) throw new NotFoundException('Parking slot not found');

    return slot;
  }

  async findOne(criteria: Partial<ParkingSlot>) {
    const slot = await this.parkingSlotRepository.findOneBy(criteria);

    if (!slot) throw new NotFoundException('Parking slot not found');

    return slot;
  }

  async update(criteria: Partial<ParkingSlot>, updateParkingSlotDto: UpdateParkingSlotDto) {
    await this.findOne(criteria);

    const updateData = getPropsToUpdate(updateParkingSlotDto);

    await this.parkingSlotRepository.update(criteria, updateData);

    const updatedParkingSlot = await this.parkingSlotRepository.findOneBy(criteria);

    return updatedParkingSlot;
  }

  remove(id: number) {
    return `This action removes a #${id} parkingSlot`;
  }
}
