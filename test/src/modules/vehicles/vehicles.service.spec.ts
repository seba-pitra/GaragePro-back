import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { CreateVehicleDto } from '@/modules/vehicles/dto/create-vehicle.dto';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UpdateVehicleDto } from '@/modules/vehicles/dto/update-vehicle.dto';
import { createTestDatabase } from '../../../database/init';
import { createVehiclesData } from '../../../database/create-data';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { User } from '@/modules/users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';

describe('Vehicle Service', () => {
  let service: VehiclesService;
  let vehiclesRepository: Repository<Vehicle>;
  let userRepository: Repository<User>;

  let dataSource = createTestDatabase();

  let vehicleModule: TestingModule;

  beforeAll(async () => {
    await dataSource.initialize();

    vehicleModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: () => {
            const jwtSecret = 'test';
            return { secret: jwtSecret, signOptions: { expiresIn: '2h' } };
          },
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
        TypeOrmModule.forFeature([Vehicle, User]),
      ],
      providers: [VehiclesService],
    }).compile();

    service = vehicleModule.get<VehiclesService>(VehiclesService);
    vehiclesRepository = vehicleModule.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
    userRepository = vehicleModule.get<Repository<User>>(getRepositoryToken(User));
  });

  beforeEach(async () => {
    await dataSource.dropDatabase();
    await dataSource.synchronize(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(service.create).toBeDefined();
    expect(service.findAll).toBeDefined();
    expect(service.findByUserId).toBeDefined();
    expect(service.findOne).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.remove).toBeDefined();
  });

  it('create should create a vehicle', async () => {
    const newUser = userRepository.create({
      first_name: 'test_user',
      last_name: 'test_lastnma',
      email: 'testMail01@gmail.com',
      password: 'testPassword1',
      phone: '1111611111',
    });
    await userRepository.save(newUser);

    const createvehicleDto: CreateVehicleDto = {
      color: 'White',
      model: 'Toyota Hilux',
      plateNumber: 'AA 654 FGE',
      userId: newUser.id,
    };

    const newVehicle = await service.create(newUser, createvehicleDto);

    expect(newVehicle).toHaveProperty('vehicle');
  });

  it('create should throw an error if user does not exist', async () => {
    try {
      const fakeUser: User = {
        id: '123bae1e-596f-43fd-9909-6a65ed3f5298',
        is_active: true,
        is_regular_customer: false,
        roles: ['customer'],
        created_at: new Date(),
        checkFieldBeforeInsert: () => {},
        checkFieldBeforeUpdate: () => {},
        first_name: 'test_user',
        last_name: 'test_lastnma',
        email: 'testMail01@gmail.com',
        password: 'testPassword1',
        phone: '1111611111',
      };

      const createVehicleDto: CreateVehicleDto = {
        plateNumber: 'AA GBC 13',
        model: 'Toyota Corolla',
        color: 'Black',
        userId: '123bae1e-596f-43fd-9909-6a65ed3f5298',
      };

      await service.create(fakeUser, createVehicleDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('User not found');
    }
  });

  it('create should throw an error if plate numer already exists', async () => {
    let plateNumber: string;

    try {
      const { user, vehicles } = await createVehiclesData(dataSource);
      plateNumber = vehicles[0].plate_number;

      const createVehicleDto: CreateVehicleDto = {
        plateNumber: plateNumber,
        model: 'Toyota Corolla',
        color: 'Black',
        userId: user.id,
      };

      await service.create(user, createVehicleDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(`Vehicle already exists with plate number: ${plateNumber}`);
    }
  });

  it('findAll should return an array of vehicles', async () => {
    await createVehiclesData(dataSource);

    const paginationDto: PaginationDto = { limit: 1, offset: 0 };

    const vehicles = await service.findAll(paginationDto);

    expect(vehicles).toHaveProperty('vehicles');
    expect(vehicles).toEqual({
      vehicles: [
        {
          color: 'Black',
          created_at: expect.any(Date),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: 'FE 6A0 TEST',
        },
      ],
    });
  });

  it('findAll should throw an error if vehicles do not exist', async () => {
    try {
      const paginationDto: PaginationDto = { limit: 1, offset: 0 };
      await service.findAll(paginationDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Vehicles not found');
    }
  });

  it('findByUserId should return an array of vehicles', async () => {
    const { user } = await createVehiclesData(dataSource);

    const paginationDto: PaginationDto = { limit: 1, offset: 0 };

    const vehicles = await service.findByUserId(user.id, paginationDto);

    expect(vehicles).toHaveProperty('vehicles');
    expect(vehicles).toEqual({
      vehicles: [
        {
          color: 'Black',
          created_at: expect.any(Date),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: expect.any(String),
        },
      ],
    });
  });

  it('findByUserId should throw an error if vehicle does not exist for a given user', async () => {
    try {
      const userId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';
      const paginationDto: PaginationDto = { limit: 1, offset: 0 };
      await service.findByUserId(userId, paginationDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Vehicles not found for this user');
    }
  });

  it('findOne should return a vehicle', async () => {
    const { vehicles } = await createVehiclesData(dataSource);
    const [firstVehicle] = vehicles;

    const vehicle = await service.findOne(firstVehicle.id);

    expect(vehicle).toHaveProperty('vehicle');
    expect(vehicle).toEqual({ vehicle: firstVehicle });
  });

  it('findOne should throw an error if vehicle does not exist', async () => {
    try {
      await service.findOne('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37');
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Vehicle not found');
    }
  });

  it('update should update a vehicle', async () => {
    const { vehicles } = await createVehiclesData(dataSource);
    const [firstVehicle] = vehicles;

    const updateVehicleDto: UpdateVehicleDto = {
      color: 'White',
      plateNumber: 'AA 123 TEST',
      model: 'Peugeot 3008',
    };

    const vehicle = await service.update(firstVehicle.id, updateVehicleDto);

    expect(vehicle).toHaveProperty('vehicle');
    expect(vehicle).toEqual({
      vehicle: {
        ...updateVehicleDto,
        is_active: true,
        created_at: expect.any(Date),
        id: expect.any(String),
      },
    });
  });

  it('update should throw an error if vehicle does not exist', async () => {
    try {
      await service.findOne('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37');
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Vehicle not found');
    }
  });

  it('remove should update the property is_active of a vehicle', async () => {
    const { vehicles } = await createVehiclesData(dataSource);
    const [firstVehicle] = vehicles;

    const vehicle = await service.remove(firstVehicle.id);

    expect(vehicle).toHaveProperty('vehicle');
    expect(vehicle).toEqual({
      vehicle: {
        ...firstVehicle,
        is_active: false,
      },
    });
  });

  it('remove should throw an error if vehicle does not exist', async () => {
    try {
      await service.findOne('92b5aa6d-242f-4f71-b6d6-f7ae1d889a37');
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Vehicle not found');
    }
  });

  afterAll(async () => {
    await vehicleModule.close();
    await dataSource.destroy();
  });
});
