import { User } from '@/modules/users/entities/user.entity';

export const user: User = {
  id: '02e712fc-a7da-4017-993f-1321a94753ad',
  first_name: 'testName',
  last_name: 'testLastName',
  email: 'test.email01@gmail.com',
  roles: ['customer'],
  is_active: true,
  is_regular_customer: false,
  phone: '1111211115',
  created_at: new Date(),
  password: '',
  checkFieldBeforeInsert: jest.fn(() => {}),
  checkFieldBeforeUpdate: jest.fn(() => {}),
};
