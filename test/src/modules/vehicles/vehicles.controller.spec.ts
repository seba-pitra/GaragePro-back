import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from '@/modules/vehicles/vehicles.controller';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { CreateVehicleDto } from '@/modules/vehicles/dto/create-vehicle.dto';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UpdateVehicleDto } from '@/modules/vehicles/dto/update-vehicle.dto';
import { ExecutionContext } from '@nestjs/common';

jest.mock('@nestjs/passport', () => ({
  ...jest.requireActual('@nestjs/passport'),
  AuthGuard: jest.fn(() => ({
    canActivate: jest.fn((context: ExecutionContext) => true),
  })),
}));

describe('Vehicle Controller', () => {
  let controller: VehiclesController;

  const dataVehicle = [
    {
      id: '63071878-7f3f-4694-9f0f-d8bac4163f4b',
      plate_number: 'AF 638 FF',
      model: 'Toyota Hilux',
      color: 'Gray',
      is_active: true,
      created_at: '2025-02-04T19:06:25.175Z',
      user_id: '123bae1e-596f-43fd-9909-6a65ed3f5298',
    },
    {
      id: '63071878-7f3f-4694-9f0f-d8bac4163f4b',
      plate_number: 'AF 638 FF',
      model: 'Toyota Corolla',
      color: 'Black',
      is_active: false,
      created_at: '2025-02-04T19:06:25.175Z',
      user_id: '123bae1e-596f-43fd-9909-6a65ed3f5298',
    },
  ];

  const mockVehiclesService = {
    create: jest.fn((createVehicleDto: CreateVehicleDto) => ({
      vehicle: {
        plate_number: createVehicleDto.plateNumber,
        model: createVehicleDto.model,
        color: createVehicleDto.color,
        is_active: true,
      },
    })),
    findAll: jest.fn((paginationDto: PaginationDto) => {
      const { offset, limit } = paginationDto;
      for (let i = 0; i < 12; i++) {
        dataVehicle.push({
          id: '63071878-7f3f-4694-9f0f-d8bac4163f4c',
          plate_number: `AG A${i} FF`,
          model: 'Toyota Corolla',
          color: 'Red',
          is_active: i % 2 === 0 ? true : false,
          created_at: '2025-02-04T19:06:25.175Z',
          user_id: '123bae1e-596f-43fd-9909-6a65ed3f5298',
        });
      }
      return { vehicles: dataVehicle.slice(offset, limit) };
    }),
    findByUserId: jest.fn((userId: string, paginationDto: PaginationDto) => {
      const { offset, limit } = paginationDto;
      for (let i = 0; i < 12; i++) {
        dataVehicle.push({
          id: '63071878-7f3f-4694-9f0f-d8bac4163f4c',
          plate_number: `AG A${i} FF`,
          model: 'Toyota Corolla',
          color: 'Red',
          is_active: i % 2 === 0 ? true : false,
          created_at: '2025-02-04T19:06:25.175Z',
          user_id: '123bae1e-596f-43fd-9909-6a65ed3f5298',
        });
      }
      const vehicles = dataVehicle.slice(offset, limit);
      return { vehicles: vehicles.filter((veh) => veh.user_id === userId) };
    }),
    findOne: jest.fn((id: string) => {
      return { vehicle: dataVehicle.find((veh) => veh.id === id) };
    }),
    update: jest.fn((id: string, updateVehicleDto: UpdateVehicleDto) => {
      const vehicle = dataVehicle.find((veh) => veh.id === id);
      for (const key of Object.keys(updateVehicleDto)) {
        vehicle[key] = updateVehicleDto[key];
      }
      return { vehicle };
    }),
    remove: jest.fn((id: string) => {
      return { vehicle: dataVehicle.find((veh) => veh.id === id) };
    }),
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

  it('create method should return a new vehicle', async () => {
    const createVehicleDto: CreateVehicleDto = {
      color: 'White',
      model: 'Peugeot 2008',
      plateNumber: 'AD 452 DFG',
      userId: '123bae1e-596f-43fd-9909-6a65ed3f5298',
    };
    const newVehicle = await controller.create(createVehicleDto);

    expect(newVehicle).toEqual({
      vehicle: {
        color: 'White',
        is_active: true,
        model: 'Peugeot 2008',
        plate_number: 'AD 452 DFG',
      },
    });
  });

  it('findAll method should return an array of vehicles', async () => {
    const paginationDto: PaginationDto = { limit: 2, offset: 0 };

    const vehicles = await controller.findAll(paginationDto);

    expect(vehicles).toEqual({
      vehicles: [dataVehicle[0], dataVehicle[1]],
    });
  });

  it('findOne method should return a vehicle', async () => {
    const vehicle = await controller.findOne(dataVehicle[0].id);

    expect(vehicle).toEqual({
      vehicle: dataVehicle[0],
    });
  });

  it('findByUserId method should return a vehicle', async () => {
    const paginationDto: PaginationDto = { limit: 3, offset: 1 };
    const userId = '123bae1e-596f-43fd-9909-6a65ed3f5298';

    const vehicles = await controller.findByUserId(userId, paginationDto);

    expect(vehicles).toEqual({
      vehicles: [dataVehicle[1], dataVehicle[2]],
    });
  });

  it('update method should update a vehicle', async () => {
    const vehicleId = '63071878-7f3f-4694-9f0f-d8bac4163f4b';
    const updateVehicleDto: UpdateVehicleDto = { model: 'Toyota Etios' };

    const updatedVehicle = await controller.update(vehicleId, updateVehicleDto);

    expect(updatedVehicle).toEqual({
      vehicle: { ...updateVehicleDto, ...dataVehicle[0] },
    });
  });

  it('remove method should return a vehicle', async () => {
    const vehicleId = '63071878-7f3f-4694-9f0f-d8bac4163f4b';

    const removedVehicle = await controller.remove(vehicleId);

    expect(removedVehicle).toEqual({
      vehicle: { ...dataVehicle[0] },
    });
  });
});
