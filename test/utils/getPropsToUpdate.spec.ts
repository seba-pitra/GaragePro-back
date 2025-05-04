import { getPropsToUpdate } from '@/utils/getPropsToUpdate';

describe('getPropsToUpdate', () => {
  it('should return an object with keys in snake_case and values unchanged', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      isActive: true,
    };

    const expectedOutput = {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      is_active: true,
    };

    expect(getPropsToUpdate(input)).toEqual(expectedOutput);
  });
});
