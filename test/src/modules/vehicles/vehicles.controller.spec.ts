import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';

import { VehiclesController } from '@/modules/vehicles/vehicles.controller';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { CreateVehicleDto } from '@/modules/vehicles/dto/create-vehicle.dto';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UpdateVehicleDto } from '@/modules/vehicles/dto/update-vehicle.dto';

jest.mock('@nestjs/passport', () => ({
  ...jest.requireActual('@nestjs/passport'),
  AuthGuard: jest.fn(() => ({
    canActivate: jest.fn((context: ExecutionContext) => true),
  })),
}));

describe('Vehicle Controller', () => {
  let controller: VehiclesController;

  const mockVehiclesService = {
    create: jest.fn((createVehicleDto: CreateVehicleDto) => true),
    findAll: jest.fn((paginationDto: PaginationDto) => true),
    findByUserId: jest.fn((userId: string, paginationDto: PaginationDto) => true),
    findOne: jest.fn((id: string) => true),
    update: jest.fn((id: string, updateVehicleDto: UpdateVehicleDto) => true),
    remove: jest.fn((id: string) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        {
          provide: VehiclesService,
          useValue: mockVehiclesService,
        },
      ],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(controller.create).toBeDefined();
    expect(controller.findAll).toBeDefined();
    expect(controller.findByUserId).toBeDefined();
    expect(controller.findOne).toBeDefined();
    expect(controller.update).toBeDefined();
    expect(controller.remove).toBeDefined();
  });

  it('create method should call service', async () => {
    const createVehicleDto: CreateVehicleDto = {
      color: 'White',
      model: 'Peugeot 2008',
      plateNumber: 'AD 452 DFG',
      userId: '123bae1e-596f-43fd-9909-6a65ed3f5298',
    };
    await controller.create(createVehicleDto);

    expect(mockVehiclesService.create).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.create).toHaveBeenCalledWith(createVehicleDto);
  });

  it('findAll method should call service', async () => {
    const paginationDto: PaginationDto = { limit: 2, offset: 0 };

    await controller.findAll(paginationDto);

    expect(mockVehiclesService.findAll).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.findAll).toHaveBeenCalledWith(paginationDto);
  });

  it('findOne method should call service', async () => {
    const id = 'abc-123';

    await controller.findOne(id);

    expect(mockVehiclesService.findOne).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.findOne).toHaveBeenCalledWith(id);
  });

  it('findByUserId method should call service', async () => {
    const paginationDto: PaginationDto = { limit: 3, offset: 1 };
    const userId = '123bae1e-596f-43fd-9909-6a65ed3f5298';

    await controller.findByUserId(userId, paginationDto);

    expect(mockVehiclesService.findByUserId).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.findByUserId).toHaveBeenCalledWith(userId, paginationDto);
  });

  it('update method should call service', async () => {
    const vehicleId = '63071878-7f3f-4694-9f0f-d8bac4163f4b';
    const updateVehicleDto: UpdateVehicleDto = { model: 'Toyota Etios' };

    await controller.update(vehicleId, updateVehicleDto);

    expect(mockVehiclesService.update).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.update).toHaveBeenCalledWith(vehicleId, updateVehicleDto);
  });

  it('remove method should call service', async () => {
    const vehicleId = '63071878-7f3f-4694-9f0f-d8bac4163f4b';

    await controller.remove(vehicleId);

    expect(mockVehiclesService.remove).toHaveBeenCalledTimes(1);
    expect(mockVehiclesService.remove).toHaveBeenCalledWith(vehicleId);
  });
});
