import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { createTestDatabase } from '../database/init';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filters';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UserModule } from '@/modules/users/user.module';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { ValidRoles } from '@/modules/users/interfaces/valid-roles.interface';
import { createUserData } from '../database/create-data';
import { LoginUserDto } from '../../src/modules/users/dto/login-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';

describe('Users (e2e)', () => {
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
    const authRes = await request(app.getHttpServer()).post('/user/register').send(createUserDto);

    token = authRes.body.data.token;

    await dataSource
      .createQueryBuilder()
      .update(User)
      .set({ roles: `{${ValidRoles.admin}}` })
      .where('email = :email', { email: createUserDto.email })
      .returning('*')
      .execute();
  });

  it('/POST /user/register should create a a user and return a token', async () => {
    const createUserDto: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'test@gmail.com',
      password: 'password123@',
      phone: '1111111111',
    };

    const { body } = await request(app.getHttpServer())
      .post('/user/register')
      .send(createUserDto)
      .expect(201);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('user');
    expect(body.data).toEqual({
      token: expect.any(String),
      user: {
        email: createUserDto.email,
        first_name: createUserDto.firstName,
        is_regular_customer: false,
        last_name: createUserDto.lastName,
        roles: ['customer'],
      },
    });
  });

  it('/POST /user/register should throw an error if user already exists', async () => {
    const user = await createUserData(dataSource);

    const createUserDto: CreateUserDto = {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      password: 'password123@',
      phone: '1111111111',
    };

    const { body } = await request(app.getHttpServer())
      .post('/user/register')
      .send(createUserDto)
      .expect(400);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Bad Request',
        message: `User already exists with email: ${createUserDto.email}`,
        statusCode: 400,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/POST /user/login should login a user', async () => {
    const user = await createUserData(dataSource);

    const loginUserDto: LoginUserDto = {
      email: user.email,
      password: 'testPassword1',
    };

    const { body } = await request(app.getHttpServer())
      .post('/user/login')
      .send(loginUserDto)
      .expect(201);

    expect(body).toEqual({
      ok: true,
      timestamps: expect.any(String),
      data: {
        token: expect.any(String),
        user: {
          email: loginUserDto.email,
          first_name: user.first_name,
          is_regular_customer: user.is_regular_customer,
          last_name: user.last_name,
          roles: user.roles,
        },
      },
    });
  });

  it('/POST /user/login throw an error if user does not exist', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'fakeEmail@gmail.com',
      password: 'testPassword1',
    };

    const { body } = await request(app.getHttpServer())
      .post('/user/login')
      .send(loginUserDto)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: `User not found with email: ${loginUserDto.email}`,
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/GET /user should return an array of users', async () => {
    await createUserData(dataSource);

    const { body } = await request(app.getHttpServer())
      .get('/user?limit=2&offset=0')
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('users');
    expect(body.data).toHaveProperty('total');
    expect(body.data).toEqual({
      total: 2,
      users: expect.any(Array<User>),
    });
  });

  it('/GET /user/:email should return an array of vehicles', async () => {
    const user = (await createUserData(dataSource)) as User;

    const { body } = await request(app.getHttpServer())
      .get(`/user/${user.email}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user).toEqual({
      created_at: expect.any(String),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      is_active: user.is_active,
      is_regular_customer: user.is_regular_customer,
      phone: user.phone,
      roles: user.roles,
    });
  });

  it('/GET /user/:email should throw an error if user does not exist', async () => {
    const email = 'fakeEmail@gmail.com';

    const { body } = await request(app.getHttpServer())
      .get(`/user/${email}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: `User not found with email: ${email}`,
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/PATCH /user/:email should update a user', async () => {
    const user = await createUserData(dataSource);

    const updateUserDto: UpdateUserDto = {
      firstName: 'updated_first_name',
      lastName: 'updated_last_name',
    };

    const { body } = await request(app.getHttpServer())
      .patch(`/user/${user.email}`)
      .set('Authorization', `Bearer  ${token}`)
      .send(updateUserDto)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user).toEqual({
      created_at: expect.any(String),
      email: user.email,
      first_name: updateUserDto.firstName,
      last_name: updateUserDto.lastName,
      id: user.id,
      is_active: user.is_active,
      is_regular_customer: user.is_regular_customer,
      phone: user.phone,
      roles: user.roles,
    });
  });

  it('/PATCH /user/:email should throw an error if user does not exist', async () => {
    const email = 'fakeEmail@gmail.com';

    const { body } = await request(app.getHttpServer())
      .patch(`/user/${email}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: `User not found with email: ${email}`,
        statusCode: 404,
      },
      ok: false,
      stracktrace: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('/DELETE /user/:email should update the is_active property to false of a user with given email', async () => {
    const user = await createUserData(dataSource);

    const { body } = await request(app.getHttpServer())
      .delete(`/user/${user.email}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(200);

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('timestamps');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.is_active).toBeFalsy();
  });

  it('/DELETE /user/:email should throw an error if there is not a email with given email', async () => {
    const testEmail = 'fakeEmail@gmail.com';

    const { body } = await request(app.getHttpServer())
      .delete(`/user/${testEmail}`)
      .set('Authorization', `Bearer  ${token}`)
      .expect(404);

    expect(body).toEqual({
      data: null,
      error: {
        error: 'Not Found',
        message: `User not found with email: ${testEmail}`,
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
