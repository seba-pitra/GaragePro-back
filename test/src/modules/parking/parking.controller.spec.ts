import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PaginationDto } from '@/common/dtos/pagination.dto';
import { ParkingController } from '@/modules/parking/parking.controller';
import { ParkingService } from '@/modules/parking/parking.service';
import { CreateReservationDto } from '@/modules/parking/dto/create-reservation.dto';
import { CreateTotalCostDto } from '@/modules/parking/dto/create-total-cost.dto';
import { UnoccupyReservationDto } from '@/modules/parking/dto/unoccupy-reservation.dto';
import { user } from './mocks/user-data';
import { UpdateReservationDto } from '@/modules/parking/dto/update-reservation.dto';

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
    reserve: jest.fn(),
    createTotalCost: jest.fn(),
    findAll: jest.fn(),
    findOneReservationSlot: jest.fn(),
    update: jest.fn(),
    unoccupy: jest.fn(),
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
      entryDate: '2025-06-04',
      entryHour: '13:00',
      exitDate: '2025-06-04',
      exitHour: '14:00',
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

    expect(service.findOneReservationSlot).toHaveBeenCalledTimes(1);
    expect(service.findOneReservationSlot).toHaveBeenCalledWith(id);
  });

  it('update should call service method', async () => {
    const id = '6a5a5312-72a7-4091-80aa-76627467f830';

    const updateReservationDto: UpdateReservationDto = {
      actualEntryTime: new Date().toISOString(),
      actualExitTime: new Date().toISOString(),
    };

    await controller.update(id, updateReservationDto);

    expect(service.update).toHaveBeenCalledTimes(1);
    expect(service.update).toHaveBeenCalledWith(id, updateReservationDto);
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
