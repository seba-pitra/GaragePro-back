import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationSlot } from './entities/reservation-slot.entity';
import { User } from '../users/entities/user.entity';
import { ParkingSlotsService } from '../parking-slots/parking-slots.service';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UnoccupyReservationDto } from './dto/unoccupy-reservation.dto';
import { CreateTotalCostDto } from './dto/create-total-cost.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { getPropsToDatabase } from '@/utils/getPropsToDatabase';
import { Status } from './interfaces/reservation.interface';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,

    @InjectRepository(ReservationSlot)
    private readonly reservationSlotRepository: Repository<ReservationSlot>,

    private readonly parkingSlotService: ParkingSlotsService,
  ) {}

  async reserve(user: User, createReservationDto: CreateReservationDto) {
    const { slotCode } = createReservationDto;

    const parkingSlot = await this.parkingSlotService.findOneBySlotCode(slotCode);

    const reservation = await this.createReservation(user, createReservationDto);

    const reservationSlot = new ReservationSlot();
    reservationSlot.reservation = reservation;
    reservationSlot.parking_slot = parkingSlot;

    const newReservation = await this.reservationSlotRepository.save(reservationSlot);

    return newReservation;
  }

  async createTotalCost(id: string, createTotalCostDto: CreateTotalCostDto) {
    const { actualExitTime } = createTotalCostDto;
    const { reservation } = await this.findOneReservationSlot(id);

    const { basicCost, extraTimeUsedMinutes, penaltyCost, totalCost } = this.calculateCost({
      actualEntryDate: reservation.actual_entry_time,
      actualExitDate: new Date(actualExitTime),
      basicCost: +reservation.basic_cost,
      durationInMinutes: reservation.duration_in_minutes,
      penaltyRatePerMinute: 0.5,
      ratePerMinute: 2,
    });

    return { basicCost, extraTimeUsedMinutes, penaltyCost, totalCost };
  }

  private async createReservation(user: User, createReservationDto: CreateReservationDto) {
    const { entryTime, exitTime, basicCost, durationInMinutes } = createReservationDto;

    // Verify that the entry and exit time are valid dates
    const areValidDates =
      !entryTime ||
      !exitTime ||
      isNaN(new Date(entryTime).getTime()) ||
      isNaN(new Date(exitTime).getTime());

    if (areValidDates) throw new BadRequestException('Invalid entry or exit time');

    // Verify that the entry and exit time are greater than the current date
    const currentDate = new Date();
    const entryDate = new Date(entryTime);
    const exitDate = new Date(exitTime);

    if (entryDate < currentDate || exitDate < currentDate) {
      throw new BadRequestException('Entry and exit time must be greater than current date');
    }

    // Lookup if there is already a reservation in that slot for the selected time
    await this.verifyIfSlotIsReserved({
      slotCode: createReservationDto.slotCode,
      entryTime: entryTime,
      exitTime: exitTime,
    });

    // Create the reservation and return it
    const newReservation = this.reservationRepository.create({
      entry_time: entryTime,
      exit_time: exitTime,
      basic_cost: basicCost,
      duration_in_minutes: durationInMinutes,
      user,
    });
    await this.reservationRepository.save(newReservation);

    return newReservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto) {
    await this.findOneReservation(id);

    const propsToUpdate = getPropsToDatabase(updateReservationDto);

    await this.reservationRepository.update(id, propsToUpdate);

    const updatedReservation = await this.reservationRepository.findOneBy({ id });

    return { reservation: updatedReservation };
  }

  async unoccupy(id: string, unoccupyReservationDto: UnoccupyReservationDto) {
    const { reservation } = await this.findOneReservationSlot(id);

    const { actualExitTime, isPaid } = unoccupyReservationDto;

    await this.reservationRepository.update(reservation.id, {
      actual_exit_time: actualExitTime,
      is_paid: isPaid,
    });

    return await this.findOneReservationSlot(id);
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

  async findOneReservation(id: string) {
    const reservation = await this.reservationRepository.findOneBy({ id });

    if (!reservation) throw new NotFoundException('Reservation not found');

    return reservation;
  }

  async findOneReservationSlot(id: string) {
    const reservation = await this.reservationSlotRepository
      .createQueryBuilder('reservation_slot')
      .where({ id })
      .leftJoinAndSelect('reservation_slot.reservation', 'reservation')
      .leftJoinAndSelect('reservation_slot.parking_slot', 'parkingSlot')
      .getOne();

    if (!reservation) throw new NotFoundException('Reservation not found');

    return reservation;
  }

  async findByStatus(status: Status) {
    const reservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.status = :status', { status })
      .getMany();

    return reservations;
  }

  async checkExpiredReservationsAndUpdateStatus() {
    const pendingReservations = await this.findByStatus(Status.pending);

    if (pendingReservations.length === 0) return;

    for (const reservation of pendingReservations) {
      const now = new Date();
      const reservationTime = new Date(reservation.booking_date);
      const diffInMinutes = Math.floor((now.getTime() - reservationTime.getTime()) / (1000 * 60));

      if (diffInMinutes >= 10) {
        await this.reservationRepository.update(reservation.id, { status: Status.expired });
      }
    }
  }

  private async verifyIfSlotIsReserved(options: {
    slotCode: string;
    entryTime: string;
    exitTime: string;
  }) {
    const { slotCode, entryTime, exitTime } = options;

    const reservationExists = await this.reservationRepository
      .createQueryBuilder('reservation')
      .innerJoin('reservation.reservation_slot', 'reservation_slot')
      .innerJoin('reservation_slot.parking_slot', 'slot')
      .where('slot.slot_code = :slotCode', { slotCode })
      .andWhere('reservation.entry_time < :exitTime', { exitTime: new Date(exitTime) })
      .andWhere('reservation.exit_time > :entryTime', { entryTime: new Date(entryTime) })
      .getOne();

    if (reservationExists) {
      throw new BadRequestException(
        'There is already a reservation in this slot for the selected time',
      );
    }
  }

  private calculateCost(options: {
    actualEntryDate: Date;
    actualExitDate: Date;
    basicCost: number;
    durationInMinutes: number;
    ratePerMinute: number;
    penaltyRatePerMinute: number;
  }) {
    const { actualEntryDate, actualExitDate, basicCost, durationInMinutes, penaltyRatePerMinute } =
      options;

    let totalCost: number = 0;

    if (isNaN(actualEntryDate.getTime()) || isNaN(actualExitDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const timeUsedMs = actualExitDate.getTime() - actualEntryDate.getTime();
    const timeUsedMinutes = Math.floor(timeUsedMs / (1000 * 60));

    if (timeUsedMinutes === durationInMinutes || timeUsedMinutes < durationInMinutes) {
      totalCost = basicCost;
      return { basicCost, totalCost, penaltyCost: 0, extraTimeUsedMinutes: 0 };
    }

    const extraTimeUsedMinutes = timeUsedMinutes - durationInMinutes;
    const totalPenaltyCost = extraTimeUsedMinutes * penaltyRatePerMinute;

    totalCost = +(Number(basicCost) + totalPenaltyCost).toFixed(2);

    return { basicCost, totalCost, penaltyCost: totalPenaltyCost, extraTimeUsedMinutes };
  }
}
