import { User } from '@/modules/users/entities/user.entity';

export const user: User = {
  id: '02e712fc-a7da-4017-993f-1321a94753ad',
  firstName: 'testName',
  lastName: 'testLastName',
  email: 'test.email01@gmail.com',
  roles: ['customer'],
  isActive: true,
  isRegularCustomer: false,
  phone: '1111211115',
  createdAt: new Date(),
  password: '',
  checkFieldBeforeInsert: jest.fn(() => {}),
  checkFieldBeforeUpdate: jest.fn(() => {}),
};
