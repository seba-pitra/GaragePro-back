import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationSlot } from './entities/reservation-slot.entity';
import { User } from '../auth/entities/user.entity';
import { ParkingSlotsService } from '../parking-slots/parking-slots.service';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UnoccupyReservationDto } from './dto/unoccupy-reservation.dto';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,

    @InjectRepository(ReservationSlot)
    private readonly reservationSlotRepository: Repository<ReservationSlot>,

    private readonly parkingSlotService: ParkingSlotsService,
  ) {}

  async create(user: User, createReservationDto: CreateReservationDto) {
    const { slotCode } = createReservationDto;

    const parkingSlot = await this.parkingSlotService.findOneBySlotCode(slotCode);

    if (parkingSlot.is_reserved) throw new BadRequestException('Parking Slot was already reserved');

    const updatedSlot = await this.parkingSlotService.update(
      { slot_code: slotCode },
      { IsReserved: true },
    );

    const reservation = await this.createReservation(user, createReservationDto);

    const reservationSlot = new ReservationSlot();
    reservationSlot.reservation = reservation;
    reservationSlot.parking_slot = updatedSlot;

    const newReservation = await this.reservationSlotRepository.save(reservationSlot);

    return newReservation;
  }

  private async createReservation(user: User, createReservationDto: CreateReservationDto) {
    const { actualEntryTime, basicCost, durationInMinutes } = createReservationDto;

    const newReservation = this.reservationRepository.create({
      actual_entry_time: actualEntryTime,
      basic_cost: basicCost,
      duration_in_minutes: durationInMinutes,
      user,
    });

    await this.reservationRepository.save(newReservation);

    return newReservation;
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const reservations = await this.reservationSlotRepository
      .createQueryBuilder('reservation_slot')
      .leftJoinAndSelect('reservation_slot.reservation', 'reservation')
      .leftJoinAndSelect('reservation_slot.parking_slot', 'parkingSlot')
      .take(limit)
      .skip(offset)
      .getMany();

    if (!reservations.length) throw new NotFoundException('Reservations not found');

    return reservations;
  }

  async findOne(id: string) {
    const reservation = await this.reservationSlotRepository
      .createQueryBuilder('reservation_slot')
      .where({ id })
      .leftJoinAndSelect('reservation_slot.reservation', 'reservation')
      .leftJoinAndSelect('reservation_slot.parking_slot', 'parkingSlot')
      .getOne();

    if (!reservation) throw new NotFoundException('Reservation not found');

    return reservation;
  }

  async update(id: string, unoccupyReservationDto: UnoccupyReservationDto) {
    await this.findOne(id);

    const { actualExitTime, slotCode } = unoccupyReservationDto;

    await this.parkingSlotService.update({ slot_code: slotCode }, { IsReserved: false });

    // TODO: create total cost based in entry,exit times and penalty
    await this.reservationRepository.update(id, {
      actual_exit_time: actualExitTime,
      is_paid: true,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} parking`;
  }
}
