import { Repository } from 'typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

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
  private readonly pricePerHour: number;

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,

    @InjectRepository(ReservationSlot)
    private readonly reservationSlotRepository: Repository<ReservationSlot>,

    private readonly parkingSlotService: ParkingSlotsService,

    private readonly configService: ConfigService,
  ) {
    this.pricePerHour = this.configService.get('pricePerHour');
  }

  async reserve(user: User, createReservationDto: CreateReservationDto) {
    const { slotCode } = createReservationDto;

    const parkingSlot = await this.parkingSlotService.findOneBySlotCode(slotCode);

    const reservation = await this.createReservation(user, createReservationDto);

    const reservationSlot = new ReservationSlot();
    reservationSlot.reservation = reservation;
    reservationSlot.parking_slot = parkingSlot.slot;

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
    const { entryDate, exitDate, entryHour, exitHour } = createReservationDto;

    // Verify that the entry and exit time are valid dates
    const areValidDates =
      !entryDate ||
      !exitDate ||
      isNaN(new Date(entryDate).getTime()) ||
      isNaN(new Date(exitDate).getTime());

    if (areValidDates) throw new BadRequestException('Invalid entry or exit time');

    // Verify that the entry and exit time are greater than the current date
    const currentDate = new Date();
    const entryDateAux = new Date(`${entryDate}T${entryHour}`);
    const exitDateAux = new Date(`${entryDate}T${exitHour}`);

    if (entryDateAux < currentDate || exitDateAux < currentDate) {
      throw new BadRequestException('Entry and exit time must be greater than current date');
    }

    // Lookup if there is already a reservation in that slot for the selected time
    await this.verifyIfSlotIsReserved({
      slotCode: createReservationDto.slotCode,
      entryTime: entryDateAux.toISOString(),
      exitTime: exitDateAux.toISOString(),
    });

    const basicCost = this.getBasicCost(entryDate, exitDate);
    const durationInMinutes = this.getDurationInMinutes(entryDateAux, exitDateAux);

    // Create the reservation and return it
    const newReservation = this.reservationRepository.create({
      entry_time: entryDateAux.toISOString(),
      exit_time: exitDateAux.toISOString(),
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

  async getAvailableTimeSlots(date: string, slotCode: string) {
    const openingHour = 8;
    const closingHour = 18;

    // Generate time slots for the day
    const slots: { start: string; end: string }[] = [];
    for (let hour = openingHour; hour < closingHour; hour++) {
      const startHour = hour.toString().padStart(2, '0');
      const endHour = (hour + 1).toString().padStart(2, '0');
      slots.push({ start: `${startHour}:00`, end: `${endHour}:00` });
    }

    // Get reservations for the given slot and date
    const reservations = await this.reservationSlotRepository
      .createQueryBuilder('reservation_slot')
      .innerJoinAndSelect('reservation_slot.reservation', 'reservation')
      .innerJoin('reservation_slot.parking_slot', 'slot')
      .where('slot.slot_code = :slotCode', { slotCode })
      .andWhere('reservation.entry_time < :endOfDay AND reservation.exit_time > :startOfDay', {
        startOfDay: new Date(`${date}T00:00:00`),
        endOfDay: new Date(`${date}T23:59:59`),
      })
      .getMany();

    const reservationTimes = reservations.map((resSlot) => ({
      entry_time: resSlot.reservation.entry_time,
    }));

    // Filter out slots that are not reserved
    const availableSlots = slots.filter((slot) => {
      const slotStart = new Date(`${date}T${slot.start}:00`);

      const foundReservation = reservationTimes.find((reservation) => {
        const reservationEntryTime = new Date(reservation.entry_time);
        return reservationEntryTime.toISOString() === slotStart.toISOString();
      });

      if (!foundReservation) return true;
    });

    return availableSlots;
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

  getBasicCost(entry: string, exit: string) {
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);
    const durationInMinutes = this.getDurationInMinutes(entryDate, exitDate);

    const durationHours = durationInMinutes / (1000 * 60 * 60);

    const hoursToCharge = Math.ceil(durationHours);

    const totalCost = hoursToCharge * this.pricePerHour;

    return totalCost;
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

    const actualEntryDateAux = new Date(actualEntryDate);
    const actualExitDateAux = new Date(actualExitDate);

    const timeUsedMinutes = this.getDurationInMinutes(actualEntryDateAux, actualExitDateAux);

    if (timeUsedMinutes === durationInMinutes || timeUsedMinutes < durationInMinutes) {
      totalCost = basicCost;
      return { basicCost, totalCost, penaltyCost: 0, extraTimeUsedMinutes: 0 };
    }

    const extraTimeUsedMinutes = timeUsedMinutes - durationInMinutes;
    const totalPenaltyCost = extraTimeUsedMinutes * penaltyRatePerMinute;

    totalCost = +(Number(basicCost) + totalPenaltyCost).toFixed(2);

    return { basicCost, totalCost, penaltyCost: totalPenaltyCost, extraTimeUsedMinutes };
  }

  private getDurationInMinutes(entryDate: Date, exitDate: Date) {
    const diffInMs = Math.abs(exitDate.getTime() - entryDate.getTime());

    const totalMinutes = Math.floor(diffInMs / (1000 * 60));
    return totalMinutes;
  }
}
