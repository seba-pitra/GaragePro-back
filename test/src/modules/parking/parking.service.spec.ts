import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { createTestDatabase } from '../../../database/init';
import { createReservationData, createUserData } from '../../../database/create-data';
import { User } from '@/modules/auth/entities/user.entity';
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
            entities: [Reservation, ReservationSlot, ParkingSlot, User],
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([Reservation, ReservationSlot, ParkingSlot, User]),
        ParkingSlotsModule,
      ],
      providers: [ParkingService],
    }).compile();

    parkingService = parkingModule.get<ParkingService>(ParkingService);
    parkingSlotService = parkingModule.get<ParkingSlotsService>(ParkingSlotsService);
  });

  it('should be defined', () => {
    expect(parkingService).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(parkingService.createTotalCost).toBeDefined();
    expect(parkingService.findAll).toBeDefined();
    expect(parkingService.findOne).toBeDefined();
    expect(parkingService.reserve).toBeDefined();
    expect(parkingService.unoccupy).toBeDefined();
  });

  it('reserve should create a reservation', async () => {
    const newUser = await createUserData(dataSource);

    const createParkingSlotDto: CreateParkingSlotDto = { slotCode: 'A1', IsReserved: false };
    const parkingSlot = await parkingSlotService.create(createParkingSlotDto);

    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 60,
      actualEntryTime: '2025-02-07T03:39:54.254Z',
      basicCost: 30.33,
      slotCode: 'A1',
    };

    const reservation = await parkingService.reserve(newUser, createReservationDto);

    expect(reservation).toMatchObject({
      id: expect.any(String),
      created_at: expect.any(Date),
      parking_slot: {
        id: expect.any(String),
        slot_code: parkingSlot.slot_code,
        is_reserved: true,
      },
      reservation: {
        actual_entry_time: createReservationDto.actualEntryTime,
        actual_exit_time: null,
        basic_cost: createReservationDto.basicCost,
        duration_in_minutes: createReservationDto.durationInMinutes,
        is_paid: null,
        penalty: null,
        total_cost: null,
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          firstName: expect.any(String),
        }),
      },
    });
  });

  it('reserve should throw an error if parking slot is already reserved', async () => {
    try {
      const newUser = await createUserData(dataSource);
      const createParkingSlotDto: CreateParkingSlotDto = { slotCode: 'A1', IsReserved: true };
      const parkingSlot = await parkingSlotService.create(createParkingSlotDto);

      const createReservationDto: CreateReservationDto = {
        durationInMinutes: 60,
        actualEntryTime: new Date().toISOString(),
        basicCost: 30.33,
        slotCode: parkingSlot.slot_code,
      };

      await parkingService.reserve(newUser, createReservationDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Parking Slot was already reserved');
    }
  });

  it('createTotalCost should calculate the total cost', async () => {
    const { id } = await createReservationData(dataSource);

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
    const { id, reservation } = await createReservationData(dataSource);

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

  it('findAll should return an array of reservations', async () => {
    await createReservationData(dataSource);

    const paginationDto: PaginationDto = { limit: 1, offset: 0 };

    const reservations = await parkingService.findAll(paginationDto);

    expect(reservations).toMatchObject([
      {
        id: expect.any(String),
        parking_slot: expect.objectContaining({
          id: expect.any(String),
          is_reserved: true,
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

  it('findOne should return a reservation', async () => {
    const reservation = await createReservationData(dataSource);

    const result = await parkingService.findOne(reservation.id);

    expect(result.reservation).toHaveProperty('is_paid');
    expect(result.reservation).toHaveProperty('penalty');
    expect(result.reservation).toHaveProperty('total_cost');
    expect(result.reservation).toHaveProperty('actual_exit_time');
    expect(result).toMatchObject({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        is_reserved: expect.any(Boolean),
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

  it('findOne should throw an error if reservation does not exist', async () => {
    try {
      await parkingService.findOne('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37');
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Reservation not found');
    }
  });

  it('unoccupy should update free up a parking slot', async () => {
    const { id } = await createReservationData(dataSource);

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
        is_reserved: false,
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

  afterEach(async () => {
    await dataSource.dropDatabase();
    await dataSource.synchronize();
  });

  afterAll(async () => {
    await parkingModule.close();
    await dataSource.destroy();
  });
});
