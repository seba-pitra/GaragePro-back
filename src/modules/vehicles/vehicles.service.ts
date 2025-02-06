import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { PaginationDto } from '@/common/dtos/pagination.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto) {
    const { userId, plateNumber } = createVehicleDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const foundVehicle = await this.vehicleRepository.findOneBy({ plate_number: plateNumber });
    if (foundVehicle) {
      throw new BadRequestException(`Vehicle already exists with plate number: ${plateNumber}`);
    }

    const newVehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      plate_number: plateNumber,
      user: user,
    });
    await this.vehicleRepository.save(newVehicle);

    delete newVehicle.user;
    delete newVehicle.id;

    return { vehicle: newVehicle };
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const vehicles = await this.vehicleRepository.find({ skip: offset, take: limit });

    if (!vehicles.length) throw new NotFoundException('Vehicles not found');

    return { vehicles };
  }

  async findByUserId(userId: string, paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const vehicles = await this.vehicleRepository.find({
      skip: offset,
      take: limit,
      where: { user: { id: userId } },
    });

    if (!vehicles.length) throw new NotFoundException('Vehicles not found for this user');

    return { vehicles };
  }

  async findOne(id: string) {
    const vehicle = await this.vehicleRepository.findOneBy({ id });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return { vehicle };
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    if (updateVehicleDto.plateNumber) {
      updateVehicleDto['plate_number'] = updateVehicleDto['plateNumber'];
      delete updateVehicleDto.plateNumber;
    }

    await this.vehicleRepository.update(id, updateVehicleDto);

    const { vehicle } = await this.findOne(id);

    return { vehicle };
  }

  async remove(id: string) {
    await this.vehicleRepository.update(id, { is_active: false });

    const { vehicle } = await this.findOne(id);

    return { vehicle };
  }
}
