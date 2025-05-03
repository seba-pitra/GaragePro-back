import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehiclesModule } from '@/modules/vehicles/vehicles.module';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { createVehiclesData } from '../database/create-data';
import { createTestDatabase } from '../database/init';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filters';
import { CreateVehicleDto } from '@/modules/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '@/modules/vehicles/dto/update-vehicle.dto';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UserModule } from '@/modules/users/user.module';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { ValidRoles } from '@/modules/users/interfaces/valid-roles.interface';

describe('Vehicles (e2e)', () => {
  const dataSource = createTestDatabase();

  let app: INestApplication;

  let token: string;

  beforeAll(async () => {
    await dataSource.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            return {
              type: 'postgres',
              host: configService.get('DB_HOST'),
              port: +configService.get<number>('DB_PORT'),
              username: configService.get('DB_USER'),
              password: configService.get('DB_PASSWORD'),
              database: configService.get('DB_NAME'),
              entities: [Reservation, ReservationSlot, ParkingSlot, User, Vehicle],
              synchronize: true,
            };
          },
        }),
        TypeOrmModule.forFeature([Reservation, ReservationSlot, ParkingSlot, User, Vehicle]),
        UserModule,
        VehiclesModule,
      ],
      providers: [
        {
          provide: 'APP_INTERCEPTOR',
          useClass: TransformResponseInterceptor,
        },
        {
          provide: 'APP_FILTER',
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  beforeEach(async () => {
    await dataSource.dropDatabase();
    await dataSource.synchronize(true);

    const createUserDto: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'test.abc123@gmail.com',
      password: 'testPassword1',
      phone: '11112111122',
    };
    const AuthRes = await request(app.getHttpServer()).post('/auth/register').send(createUserDto);
    token = AuthRes.body.data.token;

    await dataSource
      .createQueryBuilder()
      .update(User)
      .set({ roles: `{${ValidRoles.admin}}` })
      .where('email = :email', { email: createUserDto.email })
      .returning('*')
      .execute();
  });

  it('/POST /vehicles should create a vehicle', async () => {
    const { user } = await createVehiclesData(dataSource);

    const createVehicleDto: CreateVehicleDto = {
      color: 'White',
      model: 'Toyota Corolla',
      plateNumber: 'AA TEST 123',
      userId: user.id,
    };

    const { body } = await request(app.getHttpServer())
      .post('/vehicles')
      .send(createVehicleDto)
      .set('Authorization', `Bearer  ${token}`)
      .expect(201);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicle');
    expect(body.data).toEqual({
      vehicle: {
        is_active: true,
        created_at: expect.any(String),
        plate_number: createVehicleDto.plateNumber,
        color: createVehicleDto.color,
        model: createVehicleDto.model,
      },
    });
  });

  it('/POST /vehicles should throw an error if vehicle already exists', async () => {
    const { user, vehicles } = await createVehiclesData(dataSource);

    const createVehicleDto: CreateVehicleDto = {
      color: 'White',
      model: 'Toyota Corolla',
      plateNumber: vehicles[0].plate_number,
      userId: user.id,
    };

    const { body } = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer  ${token}`)
      .send(createVehicleDto)
      .expect(400);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Bad Request',
        message: 'Vehicle already exists with plate number: FE 6A0 TEST',
        statusCode: 400,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /vehicles should return an array of vehicles', async () => {
    await createVehiclesData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get('/vehicles?limit=2&offset=0')
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicles');
    expect(body.data).toEqual({
      vehicles: [
        {
          color: 'Black',
          created_at: expect.any(String),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: expect.any(String),
        },
        {
          color: 'Black',
          created_at: expect.any(String),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: expect.any(String),
        },
      ],
    });
  });

  it(`/GET /vehicles should throw an error if there are not vehicles`, async () => {
    const { body } = await request(app.getHttpServer())
      .get('/vehicles')
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Vehicles not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /vehicles/user/:userId should return an array of vehicles', async () => {
    const { user } = await createVehiclesData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get(`/vehicles/user/${user.id}?limit=2&offset=0`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicles');
    expect(body.data).toEqual({
      vehicles: [
        {
          color: 'Black',
          created_at: expect.any(String),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: expect.any(String),
        },
        {
          color: 'Black',
          created_at: expect.any(String),
          id: expect.any(String),
          is_active: true,
          model: 'Range Rover',
          plate_number: expect.any(String),
        },
      ],
    });
  });

  it('/GET /vehicles/user/:userId should throw an error if user does not exist', async () => {
    const userId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .get(`/vehicles/user/${userId}?limit=2&offset=0`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Vehicles not found for this user',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /vehicles/:id should return a vehicle', async () => {
    const { vehicles } = await createVehiclesData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get(`/vehicles/${vehicles[0].id}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicle');
    expect(body.data.vehicle).toEqual({
      color: 'Black',
      created_at: expect.any(String),
      id: expect.any(String),
      is_active: true,
      model: 'Range Rover',
      plate_number: expect.any(String),
    });
  });

  it('/GET /vehicles/:id should throw an error if there are not vehicles in database', async () => {
    const fakeVehicleId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .get(`/vehicles/${fakeVehicleId}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Vehicle not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/PATCH /vehicles/:id should update a vehicle', async () => {
    const { vehicles } = await createVehiclesData(dataSource);

    const updateVehicleDto: UpdateVehicleDto = {
      color: 'Blue',
    };

    const { body } = await request(app.getHttpServer())
      .patch(`/vehicles/${vehicles[0].id}`)
      .set('Authorization', `Bearer  ${token}`)
      .send(updateVehicleDto)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicle');
    expect(body.data.vehicle).toEqual({
      created_at: expect.any(String),
      id: expect.any(String),
      is_active: true,
      color: updateVehicleDto.color,
      model: vehicles[0].model,
      plate_number: vehicles[0].plate_number,
    });
  });

  it('/PATCH /vehicles/:id should throw an error if there is not a vehicle with given id in database', async () => {
    const updateVehicleDto: UpdateVehicleDto = {
      color: 'Blue',
    };

    const fakeVehicleId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .patch(`/vehicles/${fakeVehicleId}`)
      .set('Authorization', `Bearer  ${token}`)
      .send(updateVehicleDto)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Vehicle not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/DELETE /vehicles/:id should update the is_active property to false of a vehicle with given id', async () => {
    const { vehicles } = await createVehiclesData(dataSource);

    const { body } = await request(app.getHttpServer())
      .delete(`/vehicles/${vehicles[0].id}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('vehicle');
    expect(body.data.vehicle).toEqual({
      created_at: expect.any(String),
      id: expect.any(String),
      is_active: false,
      color: vehicles[0].color,
      model: vehicles[0].model,
      plate_number: vehicles[0].plate_number,
    });
  });

  it('/DELETE /vehicles/:id should throw an error if there is not a vehicle with given id in database', async () => {
    const fakeVehicleId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .delete(`/vehicles/${fakeVehicleId}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Vehicle not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });
});
