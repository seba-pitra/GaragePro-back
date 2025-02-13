import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createParkingSlotData, createReservationData } from '../database/create-data';
import { createTestDatabase } from '../database/init';
import { User } from '@/modules/auth/entities/user.entity';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filters';
import { AuthModule } from '@/modules/auth/auth.module';
import { CreateUserDto } from '@/modules/auth/dto/create-user.dto';
import { ValidRoles } from '@/modules/auth/interfaces/valid-roles.interface';
import { ParkingSlotsModule } from '@/modules/parking-slots/parking-slots.module';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { CreateReservationDto } from '@/modules/parking/dto/create-reservation.dto';
import { ParkingModule } from '@/modules/parking/parking.module';
import { UnoccupyReservationDto } from '@/modules/parking/dto/unoccupy-reservation.dto';

describe('Parking (e2e)', () => {
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
              entities: [Reservation, ReservationSlot, ParkingSlot, User],
              synchronize: true,
            };
          },
        }),
        TypeOrmModule.forFeature([Reservation, ReservationSlot, ParkingSlot, User]),
        ParkingModule,
        ParkingSlotsModule,
        AuthModule,
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

  afterEach(async () => {
    await dataSource.dropDatabase();
    await dataSource.synchronize();
  });

  it('/POST /parking/reserve should create a reservation', async () => {
    const createParkingSlotDto = { slotCode: 'A3', IsReserved: false };
    const parkingSlot = await createParkingSlotData(dataSource, createParkingSlotDto);

    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 10,
      actualEntryTime: new Date().toISOString(),
      slotCode: parkingSlot.slot_code,
      basicCost: 30.33,
    };

    const { body } = await request(app.getHttpServer())
      .post('/parking/reserve')
      .send(createReservationDto)
      .set('Authorization', `Bearer  ${token}`)
      .expect(201);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toMatchObject({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        is_reserved: expect.any(Boolean),
        slot_code: expect.any(String),
      },
      reservation: {
        actual_entry_time: expect.any(String),
        actual_exit_time: null,
        basic_cost: expect.any(Number),
        booking_date: expect.any(String),
        duration_in_minutes: expect.any(Number),
        id: expect.any(String),
        is_paid: null,
        penalty: null,
        total_cost: null,
        user: {
          email: expect.any(String),
          firstName: expect.any(String),
          id: expect.any(String),
          isActive: expect.any(Boolean),
          isRegularCustomer: expect.any(Boolean),
          lastName: expect.any(String),
          phone: expect.any(String),
          roles: expect.any(Array),
        },
      },
    });
  });

  it('/POST /parking/reserve should throw an error if parking slot was already reserved', async () => {
    const createParkingSlotDto = { slotCode: 'A2', IsReserved: true };

    const parkingSlot = await createParkingSlotData(dataSource, createParkingSlotDto);

    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 10,
      actualEntryTime: new Date().toISOString(),
      slotCode: parkingSlot.slot_code,
      basicCost: 30.33,
    };

    const { body } = await request(app.getHttpServer())
      .post('/parking/reserve')
      .send(createReservationDto)
      .set('Authorization', `Bearer  ${token}`)
      .expect(400);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Bad Request',
        message: 'Parking Slot was already reserved',
        statusCode: 400,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/POST /parking/reserve should throw an error if parking slot does not exist', async () => {
    const createReservationDto: CreateReservationDto = {
      durationInMinutes: 10,
      actualEntryTime: new Date().toISOString(),
      slotCode: 'fake',
      basicCost: 30.33,
    };

    const { body } = await request(app.getHttpServer())
      .post('/parking/reserve')
      .send(createReservationDto)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Parking slot not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/POST /parking/create-total-cost/:id should return the cost of a reservation', async () => {
    const reservation = await createReservationData(dataSource);

    const { body } = await request(app.getHttpServer())
      .post(`/parking/create-total-cost/${reservation.id}`)
      .send({ actualExitTime: new Date().toISOString() })
      .set('Authorization', `Bearer  ${token}`)
      .expect(201);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toEqual({
      basicCost: expect.any(Number),
      extraTimeUsedMinutes: expect.any(Number),
      penaltyCost: expect.any(Number),
      totalCost: expect.any(Number),
    });
  });

  it('/POST /parking/create-total-cost/:id should throw an error if reservation does not exist', async () => {
    const fakeId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .post(`/parking/create-total-cost/${fakeId}`)
      .send({ actualExitTime: new Date().toISOString() })
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Reservation not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /parking should return an array of reservations', async () => {
    await createReservationData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get('/parking?limit=2&offset=0')
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body).toHaveProperty('data');
    expect(body.data).toMatchObject([
      {
        id: expect.any(String),
        parking_slot: {
          id: expect.any(String),
          is_reserved: expect.any(Boolean),
          slot_code: expect.any(String),
        },
        reservation: {
          actual_entry_time: expect.any(String),
          actual_exit_time: null,
          basic_cost: expect.any(String),
          booking_date: expect.any(String),
          duration_in_minutes: expect.any(Number),
          id: expect.any(String),
          is_paid: null,
          penalty: null,
          total_cost: null,
        },
      },
    ]);
  });

  it('/GET /parking should throw an error if there are not reservations in database', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/parking?limit=2&offset=0')
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Reservations not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /parking/:id should return a reservation', async () => {
    const { id } = await createReservationData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get(`/parking/${id}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body).toHaveProperty('data');
    expect(body.data).toMatchObject({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        is_reserved: expect.any(Boolean),
        slot_code: expect.any(String),
      },
      reservation: {
        actual_entry_time: expect.any(String),
        actual_exit_time: null,
        basic_cost: expect.any(String),
        booking_date: expect.any(String),
        duration_in_minutes: expect.any(Number),
        id: expect.any(String),
        is_paid: null,
        penalty: null,
        total_cost: null,
      },
    });
  });

  it('/GET /parking/:id should throw an error if reservation does not exist in database', async () => {
    const fakeId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const { body } = await request(app.getHttpServer())
      .get(`/parking/${fakeId}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Reservation not found',
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/PATCH /parking/:id  should free up a parking slot', async () => {
    const { id } = await createReservationData(dataSource);

    const unoccupyReservationDto: UnoccupyReservationDto = {
      actualExitTime: new Date().toISOString(),
      isPaid: true,
      slotCode: 'A1',
    };

    const { body } = await request(app.getHttpServer())
      .patch(`/parking/unoccupy/${id}`)
      .set('Authorization', `Bearer  ${token}`)
      .send(unoccupyReservationDto)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toEqual({
      id: expect.any(String),
      parking_slot: {
        id: expect.any(String),
        is_reserved: false,
        slot_code: unoccupyReservationDto.slotCode,
      },
      reservation: {
        actual_entry_time: expect.any(String),
        actual_exit_time: expect.any(String),
        basic_cost: expect.any(String),
        booking_date: expect.any(String),
        duration_in_minutes: expect.any(Number),
        id: expect.any(String),
        is_paid: unoccupyReservationDto.isPaid,
        penalty: null,
        total_cost: null,
      },
    });
  });

  it('/PATCH /vehicles/:id should throw an error if there is not a vehicle with given id in database', async () => {
    const fakeId = '92b5aa6d-242f-4f71-b6d6-f7ae1d889a37';

    const unoccupyReservationDto: UnoccupyReservationDto = {
      actualExitTime: new Date().toISOString(),
      isPaid: true,
      slotCode: 'A1',
    };

    const { body } = await request(app.getHttpServer())
      .patch(`/parking/unoccupy/${fakeId}`)
      .set('Authorization', `Bearer  ${token}`)
      .send(unoccupyReservationDto)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: 'Reservation not found',
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
