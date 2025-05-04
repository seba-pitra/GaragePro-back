import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '@/modules/users/user.controller';
import { UserService } from '@/modules/users/user.service';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { ExecutionContext } from '@nestjs/common';
import { LoginUserDto } from '@/modules/users/dto/login-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';

jest.mock('@nestjs/passport', () => ({
  ...jest.requireActual('@nestjs/passport'),
  AuthGuard: jest.fn(() => ({
    canActivate: jest.fn((context: ExecutionContext) => true),
  })),
}));

describe('User Controller', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    create: jest.fn(),
    login: jest.fn(),
    findAll: jest.fn(),
    findOneByEmail: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(controller.register).toBeDefined();
    expect(controller.login).toBeDefined();
    expect(controller.findAll).toBeDefined();
    expect(controller.findOneByEmail).toBeDefined();
    expect(controller.update).toBeDefined();
    expect(controller.delete).toBeDefined();
  });

  it('register method should call service', async () => {
    const newUser: CreateUserDto = {
      firstName: 'test',
      lastName: 'test',
      email: 'testEmail10@gmail.com',
      password: 'password1@',
      phone: '1111111111',
    };

    await controller.register(newUser);

    expect(service.create).toHaveBeenCalledWith(newUser);
  });

  it('login method should call service', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'testEmail10@gmail.com',
      password: 'password1@',
    };

    await controller.login(loginUserDto);

    expect(service.login).toHaveBeenCalledWith(loginUserDto);
  });

  it('findAll method should call service', async () => {
    const paginationDto = { limit: 10, offset: 0 };
    await controller.findAll(paginationDto);

    expect(service.findAll).toHaveBeenCalledWith(paginationDto);
  });

  it('findOneByEmail method should call service', async () => {
    const email = 'test@gmail.com';

    await controller.findOneByEmail(email);

    expect(service.findOneByEmail).toHaveBeenCalledWith(email);
  });

  it('update method should call service', async () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'updatedFirstName',
      lastName: 'updatedLastName',
      email: 'test@gmail.com',
    };

    await controller.update(updateUserDto.email, updateUserDto);

    expect(service.update).toHaveBeenCalledWith(updateUserDto.email, updateUserDto);
  });

  it('delete method should call service', async () => {
    const email = 'test@gmail.com';

    await controller.delete(email);

    expect(service.delete).toHaveBeenCalledWith(email);
  });
});
