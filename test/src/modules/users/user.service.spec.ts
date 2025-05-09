import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UserService } from '@/modules/users/user.service';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { LoginUserDto } from '@/modules/users/dto/login-user.dto';
import { createTestDatabase } from '../../../database/init';
import { createUserData } from '../../../database/create-data';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';

describe('User Service', () => {
  let service: UserService;

  let dataSource = createTestDatabase();

  let userModule: TestingModule;

  beforeAll(async () => {
    await dataSource.initialize();

    userModule = await Test.createTestingModule({
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
      providers: [UserService],
    }).compile();

    service = userModule.get<UserService>(UserService);
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
    expect(service.login).toBeDefined();
    expect(service.findAll).toBeDefined();
    expect(service.findOneByEmail).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.delete).toBeDefined();
  });

  it('create should create a user', async () => {
    const createUserDto: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'test10@gmail.com',
      password: 'Password123@',
      phone: '1111111111',
    };

    const result = await service.create(createUserDto);

    expect(result).toHaveProperty('user');
    expect(result.user).toMatchObject({
      first_name: 'test',
      last_name: 'test',
      email: 'test10@gmail.com',
      roles: ['customer'],
      is_regular_customer: false,
    });
  });

  it('create should return a token', async () => {
    const createUserDto: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'test10@gmail.com',
      password: 'Password123@',
      phone: '1111111111',
    };

    const result = await service.create(createUserDto);

    expect(result).toHaveProperty('token');
    expect(result.token).toEqual(expect.any(String));
  });

  it('create should throw an error if there is already a user with the given email', async () => {
    const createUserDto: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'test10@gmail.com',
      password: 'Password123@',
      phone: '1111111111',
    };
    try {
      await service.create(createUserDto);
      await service.create(createUserDto);

      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(`User already exists with email: ${createUserDto.email}`);
    }
  });

  it('login should return a user and a token', async () => {
    const user = (await createUserData(dataSource)) as User;

    const LoginUserDto: LoginUserDto = {
      email: user.email,
      password: 'testPassword1',
    };

    const result = await service.login(LoginUserDto);

    expect(result).toHaveProperty('user');
    expect(result.user).toHaveProperty('email', user.email);
    expect(result).toHaveProperty('token');
    expect(result.token).toEqual(expect.any(String));
  });

  it('login should throw an error if there is not a user with the given email', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'test@gmail.com',
      password: 'testPassword1',
    };

    try {
      await service.login(loginUserDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`User not found with email: ${loginUserDto.email}`);
    }
  });

  it('login should throw an error if passwords does not match', async () => {
    try {
      const user = (await createUserData(dataSource)) as User;

      const loginUserDto: LoginUserDto = {
        email: user.email,
        password: 'fakePassword1@',
      };

      await service.login(loginUserDto);

      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe(`Password is not correct`);
    }
  });

  it('findAll should return an array of users', async () => {
    await createUserData(dataSource);

    const result = await service.findAll({ limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.users).toMatchObject([
      {
        email: 'test_user@gmail.com',
        first_name: 'test_user',
        is_active: true,
        last_name: 'test_lastnma',
        phone: '1111611111',
        roles: ['customer'],
      },
    ]);
  });

  it('findAll should throw an error if there are not users in database', async () => {
    try {
      await service.findAll({ limit: 10, offset: 0 });
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('No users found');
    }
  });

  it('findOneByEmail should return a user', async () => {
    const user = (await createUserData(dataSource)) as User;

    const result = await service.findOneByEmail(user.email);

    expect(result).toHaveProperty('user');
    expect(result.user).toMatchObject({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      roles: user.roles,
      is_active: user.is_active,
      is_regular_customer: user.is_regular_customer,
    });
  });

  it('findOneByEmail should throw an error if user does not exist', async () => {
    const email = 'fakeEmail@gmail.com';
    try {
      await service.findOneByEmail(email);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`User not found with email: ${email}`);
    }
  });

  it('update should update a user', async () => {
    const user = (await createUserData(dataSource)) as User;

    const updateUserDto: UpdateUserDto = {
      firstName: 'test_updated',
      lastName: 'test_updated',
    };

    const { user: updatedUser } = await service.update(user.email, updateUserDto);

    expect(updatedUser.first_name).toBe(updateUserDto.firstName);
    expect(updatedUser.last_name).toBe(updateUserDto.lastName);
  });

  it('update should throw an error if user does not exist', async () => {
    const email = 'fakeEmail@gmail.com';

    const updateUserDto: UpdateUserDto = {
      firstName: 'test_updated',
      lastName: 'test_updated',
    };

    try {
      await service.update(email, updateUserDto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`User not found with email: ${email}`);
    }
  });

  it('delete should update the property is_active of a user', async () => {
    const user = (await createUserData(dataSource)) as User;

    const { user: resultUser } = await service.delete(user.email);

    expect(resultUser).toHaveProperty('is_active', false);
  });

  it('delete should throw an error if user does not exist', async () => {
    const email = 'fakeEmail@gmail.com';
    try {
      await service.delete(email);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe(`User not found with email: ${email}`);
    }
  });

  afterAll(async () => {
    await userModule.close();
    await dataSource.destroy();
  });
});
