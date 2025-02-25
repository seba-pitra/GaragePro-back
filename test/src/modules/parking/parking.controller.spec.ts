import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PaginationDto } from '@/common/dtos/pagination.dto';
import { ParkingController } from '@/modules/parking/parking.controller';
import { ParkingService } from '@/modules/parking/parking.service';
import { CreateReservationDto } from '@/modules/parking/dto/create-reservation.dto';
import { CreateTotalCostDto } from '@/modules/parking/dto/create-total-cost.dto';
import { UnoccupyReservationDto } from '@/modules/parking/dto/unoccupy-reservation.dto';
import { user } from './mocks/user-data';

jest.mock('@nestjs/passport', () => ({
  ...jest.requireActual('@nestjs/passport'),
  AuthGuard: jest.fn(() => ({
    canActivate: jest.fn((context: ExecutionContext) => true),
  })),
}));

describe('Parking Controller', () => {
  let controller: ParkingController;
  let service: ParkingService;

  const mockParkingService = {
    reserve: jest.fn((createReservationDto: CreateReservationDto) => ({
      reservation: {
        duration_in_minutes: 60,
        actual_entry_time: new Date().toISOString(),
        basic_cost: 30.33,
        user: {
          id: '02e712fc-a7da-4017-993f-1321a94753ad',
          firstName: 'testName',
          lastName: 'testLastName',
          email: 'test.email01@gmail.com',
          roles: ['customer'],
          isActive: true,
          isRegularCustomer: false,
          phone: '1111211115',
          createdAt: new Date().toISOString(),
        },
        actual_exit_time: null,
        penalty: null,
        total_cost: null,
        is_paid: false,
        booking_date: new Date().toISOString(),
        id: '20b996eb-3a0b-4c25-a4e3-ac8f45a4f24b',
        created_at: new Date().toISOString(),
      },
      parking_slot: {
        id: '7d16b9e0-348a-4e77-9527-22721bef14fc',
        slot_code: 'A1',
        is_reserved: true,
        created_at: new Date().toISOString(),
      },
      id: '54974fd1-51c9-4027-8d7a-5a5f52500d8a',
      created_at: '2025-02-12T04:21:11.057Z',
    })),
    createTotalCost: jest.fn((createTotalCostDto: CreateTotalCostDto) => ({
      basicCost: 30.33,
      extraTimeUsedMinutes: 108,
      penaltyCost: 54,
      totalCost: 84.33,
    })),
    findAll: jest.fn((paginationDto: PaginationDto) => {
      return [
        {
          id: '6a5a5312-72a7-4091-80aa-76627467f830',
          created_at: '2025-02-12T06:43:06.424Z',
          reservation: {
            id: 'c501ef15-1730-49bf-8733-c1308744dfcd',
            duration_in_minutes: 10,
            actual_entry_time: '2025-02-07T03:39:54.254Z',
            actual_exit_time: null,
            basic_cost: '30.33',
            penalty: null,
            total_cost: null,
            is_paid: null,
            booking_date: '2025-02-12T06:43:06.371Z',
            created_at: '2025-02-12T06:43:06.371Z',
          },
          parking_slot: {
            id: '7d16b9e0-348a-4e77-9527-22721bef14fc',
            slot_code: 'A2',
            is_reserved: true,
            created_at: '2025-02-07T22:00:07.172Z',
          },
        },
      ];
    }),
    findOne: jest.fn((id: string) => ({
      id: '6a5a5312-72a7-4091-80aa-76627467f830',
      created_at: new Date().toISOString(),
      reservation: {
        id: 'c501ef15-1730-49bf-8733-c1308744dfcd',
        duration_in_minutes: 10,
        actual_entry_time: '2025-02-07T03:39:54.254Z',
        actual_exit_time: null,
        basic_cost: '30.33',
        penalty: null,
        total_cost: null,
        is_paid: null,
        booking_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      parking_slot: {
        id: '7d16b9e0-348a-4e77-9527-22721bef14fc',
        slot_code: 'A2',
        is_reserved: true,
        created_at: new Date().toISOString(),
      },
    })),
    unoccupy: jest.fn((id: string, unoccupyReservationDto: UnoccupyReservationDto) => ({
      id: '6a5a5312-72a7-4091-80aa-76627467f830',
      created_at: '2025-02-12T06:43:06.424Z',
      reservation: {
        id: 'c501ef15-1730-49bf-8733-c1308744dfcd',
        duration_in_minutes: 10,
        actual_entry_time: '2025-02-07T03:39:54.254Z',
        actual_exit_time: '2025-02-07T04:39:54.254Z',
        basic_cost: '30.33',
        penalty: null,
        total_cost: null,
        is_paid: unoccupyReservationDto.isPaid,
        booking_date: '2025-02-12T06:43:06.371Z',
        created_at: '2025-02-12T06:43:06.371Z',
      },
      parking_slot: {
        id: '7d16b9e0-348a-4e77-9527-22721bef14fc',
        slot_code: unoccupyReservationDto.slotCode,
        is_reserved: false,
        created_at: '2025-02-07T22:00:07.172Z',
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingController],
      providers: [
        {
          provide: ParkingService,
          useValue: mockParkingService,
        },
      ],
    }).compile();

    controller = module.get<ParkingController>(ParkingController);
    service = module.get<ParkingService>(ParkingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('reserve should call service method', async () => {
    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 60,
      actualEntryTime: '2025-02-07T03:39:54.254Z',
      basicCost: 30.33,
      slotCode: 'A1',
    };

    await controller.reserve(user, createReservationDto);

    expect(service.reserve).toHaveBeenCalledWith(user, createReservationDto);
  });

  it('createTotalCost should call service method', async () => {
    const id = '6a5a5312-72a7-4091-80aa-76627467f830';

    const createTotalCostDto: CreateTotalCostDto = {
      actualExitTime: new Date().toISOString(),
    };

    await controller.createTotalCost(id, createTotalCostDto);

    expect(service.createTotalCost).toHaveBeenCalledTimes(1);
    expect(service.createTotalCost).toHaveBeenCalledWith(id, createTotalCostDto);
  });

  it('findAll should call service method', async () => {
    const paginationDto: PaginationDto = { limit: 2, offset: 0 };

    await controller.findAll(paginationDto);

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findAll).toHaveBeenCalledWith(paginationDto);
  });

  it('findOne should call service method', async () => {
    const id = '6a5a5312-72a7-4091-80aa-76627467f830';

    await controller.findOne(id);

    expect(service.findOne).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('unoccupy should call service method', async () => {
    const id = '6a5a5312-72a7-4091-80aa-76627467f830';

    const unoccupyReservationDto: UnoccupyReservationDto = {
      actualExitTime: new Date().toISOString(),
      isPaid: true,
      slotCode: 'A1',
    };

    await controller.unoccupy(id, unoccupyReservationDto);

    expect(service.unoccupy).toHaveBeenCalledTimes(1);
    expect(service.unoccupy).toHaveBeenCalledWith(id, unoccupyReservationDto);
  });
});
