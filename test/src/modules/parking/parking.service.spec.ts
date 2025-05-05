import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadRequestException, ExecutionContext, NotFoundException } from '@nestjs/common';

import { createTestDatabase } from '../../../database/init';
import { createReservationData, createUserData } from '../../../database/create-data';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { ParkingService } from '@/modules/parking/parking.service';
import { ParkingSlotsService } from '@/modules/parking-slots/parking-slots.service';
import { ParkingSlotsModule } from '@/modules/parking-slots/parking-slots.module';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { CreateReservationDto } from '@/modules/parking/dto/create-reservation.dto';
import { CreateParkingSlotDto } from '@/modules/parking-slots/dto/create-parking-slot.dto';
import { CreateTotalCostDto } from '@/modules/parking/dto/create-total-cost.dto';
import { UnoccupyReservationDto } from '@/modules/parking/dto/unoccupy-reservation.dto';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UpdateReservationDto } from '@/modules/parking/dto/update-reservation.dto';
import { Status } from '@/modules/parking/interfaces/reservation.interface';

jest.mock('@nestjs/passport', () => ({
  ...jest.requireActual('@nestjs/passport'),
  AuthGuard: jest.fn(() => ({
    canActivate: jest.fn((context: ExecutionContext) => true),
  })),
}));

describe('Parking Service', () => {
  let parkingService: ParkingService;
  let parkingSlotService: ParkingSlotsService;

  let dataSource = createTestDatabase();

  let parkingModule: TestingModule;

  beforeAll(async () => {
    await dataSource.initialize();

    parkingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USER'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_NAME'),
            entities: [Reservation, ReservationSlot, ParkingSlot, User, Vehicle],
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([Reservation, ReservationSlot, ParkingSlot, User, Vehicle]),
        ParkingSlotsModule,
      ],
      providers: [ParkingService],
    }).compile();

    parkingService = parkingModule.get<ParkingService>(ParkingService);
    parkingSlotService = parkingModule.get<ParkingSlotsService>(ParkingSlotsService);
  });

  beforeEach(async () => {
    await dataSource.dropDatabase();
    await dataSource.synchronize(true);
  });

  it('should be defined', () => {
    expect(parkingService).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(parkingService.createTotalCost).toBeDefined();
    expect(parkingService.findAll).toBeDefined();
    expect(parkingService.findOneReservation).toBeDefined();
    expect(parkingService.findOneReservationSlot).toBeDefined();
    expect(parkingService.reserve).toBeDefined();
    expect(parkingService.unoccupy).toBeDefined();
  });

  it('reserve should create a reservation', async () => {
    const createUserDto = {
      email: 'test_reserve@gmail.com',
      firstName: 'test_user',
      lastName: 'test_lastnma',
      password: 'testPassword1',
      phone: '1111611111',
    };

    const newUser = await createUserData(dataSource, createUserDto);

    const createParkingSlotDto: CreateParkingSlotDto = { slotCode: 'A1' };
    const parkingSlot = await parkingSlotService.create(createParkingSlotDto);

    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 60,
      entryTime: new Date(new Date().getTime() + 10000).toISOString(),
      exitTime: new Date(new Date().getTime() + 60000).toISOString(),
      basicCost: 30.33,
      slotCode: 'A1',
    };

    const result = await parkingService.reserve(newUser, createReservationDto);

    expect(result).toMatchObject({
      id: expect.any(String),
      created_at: expect.any(Date),
      parking_slot: {
        id: expect.any(String),
        slot_code: parkingSlot.slot_code,
      },
      reservation: {
        actual_entry_time: null,
        actual_exit_time: null,
        entry_time: createReservationDto.entryTime,
        exit_time: createReservationDto.exitTime,
        basic_cost: createReservationDto.basicCost,
        duration_in_minutes: createReservationDto.durationInMinutes,
        is_paid: null,
        penalty: null,
        total_cost: null,
        booking_date: expect.any(Date),
      },
    });
  });

  it('reserve should throw an error if parking slot is already reserved', async () => {
    try {
      const { user, slot } = await createReservationData(dataSource);

      const createReservationDto: CreateReservationDto = {
        durationInMinutes: 60,
        entryTime: new Date(new Date().getTime() + 10000).toISOString(),
        exitTime: new Date(new Date().getTime() + 60000).toISOString(),
        basicCost: 30.33,
        slotCode: slot.slot_code,
      };

      await parkingService.reserve(user, createReservationDto);

      await parkingService.reserve(user, createReservationDto);

      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        'There is already a reservation in this slot for the selected time',
      );
    }
  });

  it('createTotalCost should calculate the total cost', async () => {
    const { reservationSlot } = await createReservationData(dataSource);
    const { id } = reservationSlot;

    const createTotalCostDto: CreateTotalCostDto = {
      actualExitTime: new Date().toISOString(),
    };

    const result = await parkingService.createTotalCost(id, createTotalCostDto);

    expect(result).toEqual({
      basicCost: expect.any(Number),
      extraTimeUsedMinutes: expect.any(Number),
      penaltyCost: expect.any(Number),
      totalCost: expect.any(Number),
    });
  });

  it('createTotalCost should calculate the total cost considering penalty for extra time', async () => {
    const { reservationSlot } = await createReservationData(dataSource);
    const { id } = reservationSlot;

    const date = new Date();
    date.setMinutes(date.getMinutes() + 90);

    const createTotalCostDto: CreateTotalCostDto = {
      actualExitTime: date.toISOString(),
    };

    const result = await parkingService.createTotalCost(id, createTotalCostDto);

    expect(result).toEqual({
      basicCost: expect.any(Number),
      extraTimeUsedMinutes: 30,
      penaltyCost: 15,
      totalCost: 45.33,
    });
  });

  it('update should update a reservation', async () => {
    const { reservation } = await createReservationData(dataSource);

    const { id } = reservation;

    const updateReservationDto: UpdateReservationDto = {
      status: 'confirmed',
      durationInMinutes: 120,
      entryTime: new Date(new Date().getTime() + 10000).toISOString(),
      exitTime: new Date(new Date().getTime() + 120000).toISOString(),
    };

    const { reservation: updatedReservation } = await parkingService.update(
      id,
      updateReservationDto,
    );

    expect(updatedReservation.entry_time).not.toBe(reservation.entry_time);
    expect(updatedReservation.exit_time).not.toBe(reservation.exit_time);
    expect(updatedReservation.duration_in_minutes).not.toBe(reservation.duration_in_minutes);
    expect(updatedReservation.status).not.toBe(reservation.status);

    expect(updatedReservation.entry_time.toISOString()).toBe(updateReservationDto.entryTime);
    expect(updatedReservation.exit_time.toISOString()).toBe(updateReservationDto.exitTime);
    expect(updatedReservation.duration_in_minutes).toBe(updateReservationDto.durationInMinutes);
    expect(updatedReservation.status).toBe(updateReservationDto.status);
  });

  it('checkExpiredReservationsAndUpdateStatus should verify if there are pending reservations and update them', async () => {
    const user = await createUserData(dataSource);

    const now = new Date();
    const oldDate = new Date(now.getTime() - 11 * 60 * 1000);

    const resultInsert = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Reservation)
      .values({
        booking_date: oldDate.toISOString(),
        actual_entry_time: new Date().toISOString(),
        basic_cost: 30.33,
        entry_time: new Date(new Date().getTime() + 10000).toISOString(),
        exit_time: new Date(new Date().getTime() + 60000).toISOString(),
        duration_in_minutes: 60,
        user,
      })
      .returning('*')
      .execute();

    const reservation = resultInsert.raw[0] as Reservation;

    await parkingService.checkExpiredReservationsAndUpdateStatus();

    const updatedReservations = await parkingService.findOneReservation(reservation.id);

    expect(reservation.status).toBe(Status.pending);
    expect(updatedReservations.status).toBe(Status.expired);
  });

  it('update should throw an error if reservation does not exist', async () => {
    const updateReservationDto: UpdateReservationDto = {
      status: 'confirmed',
      durationInMinutes: 120,
      entryTime: new Date(new Date().getTime() + 10000).toISOString(),
      exitTime: new Date(new Date().getTime() + 120000).toISOString(),
    };
    try {
      await parkingService.update('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37', updateReservationDto);

      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Reservation not found');
    }
  });

  it('findAll should return an array of reservations', async () => {
    await createReservationData(dataSource);

    const paginationDto: PaginationDto = { limit: 1, offset: 0 };

    const reservations = await parkingService.findAll(paginationDto);

    expect(reservations).toMatchObject([
      {
        id: expect.any(String),
        parking_slot: expect.objectContaining({
          id: expect.any(String),
          slot_code: expect.any(String),
        }),
        reservation: expect.objectContaining({
          actual_entry_time: expect.any(Date),
          actual_exit_time: null,
          basic_cost: '30.33',
          booking_date: expect.any(Date),
          duration_in_minutes: 60,
          id: expect.any(String),
          is_paid: null,
          penalty: null,
          total_cost: null,
        }),
      },
    ]);
  });

  it('findAll should throw an error if reservations do not exist', async () => {
    try {
      const paginationDto: PaginationDto = { limit: 1, offset: 0 };
      await parkingService.findAll(paginationDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Reservations not found');
    }
  });

  it('findOneReservationSlot should return a reservation', async () => {
    const { reservationSlot } = await createReservationData(dataSource);

    const result = await parkingService.findOneReservationSlot(reservationSlot.id);

    expect(result.reservation).toHaveProperty('is_paid');
    expect(result.reservation).toHaveProperty('penalty');
    expect(result.reservation).toHaveProperty('total_cost');
    expect(result.reservation).toHaveProperty('actual_exit_time');
    expect(result).toMatchObject({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        slot_code: expect.any(String),
      },
      reservation: {
        actual_entry_time: expect.any(Date),
        basic_cost: expect.any(String),
        booking_date: expect.any(Date),
        duration_in_minutes: expect.any(Number),
        id: expect.any(String),
      },
    });
  });

  it('findOneReservationSlot should throw an error if reservation does not exist', async () => {
    try {
      await parkingService.findOneReservationSlot('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37');
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Reservation not found');
    }
  });

  it('unoccupy should update free up a parking slot', async () => {
    const { reservationSlot } = await createReservationData(dataSource);
    const { id } = reservationSlot;

    const unoccupyReservationDto: UnoccupyReservationDto = {
      actualExitTime: new Date().toISOString(),
      isPaid: true,
      slotCode: 'A1',
    };

    const result = await parkingService.unoccupy(id, unoccupyReservationDto);

    expect(result.reservation).toHaveProperty('penalty');
    expect(result.reservation).toHaveProperty('total_cost');
    expect(result).toMatchObject({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        slot_code: expect.any(String),
      },
      reservation: {
        actual_entry_time: expect.any(Date),
        actual_exit_time: expect.any(Date),
        basic_cost: expect.any(String),
        booking_date: expect.any(Date),
        duration_in_minutes: expect.any(Number),
        id: expect.any(String),
        is_paid: expect.any(Boolean),
        penalty: null,
        total_cost: null,
      },
    });
  });

  it('unoccupy should throw an error if reservation does not exist', async () => {
    try {
      const unoccupyReservationDto: UnoccupyReservationDto = {
        actualExitTime: new Date().toISOString(),
        isPaid: true,
        slotCode: 'A1',
      };

      await parkingService.unoccupy('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37', unoccupyReservationDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Reservation not found');
    }
  });

  afterAll(async () => {
    await parkingModule.close();
    await dataSource.destroy();
  });
});
