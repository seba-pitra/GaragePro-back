import { comparePasswords, encryptPassword } from '@/utils/encrypt';

describe('encrypt', () => {
  it('should encrypt the password', async () => {
    const password = 'password123';

    const encryptedPassword = await encryptPassword(password);
    expect(encryptedPassword).not.toEqual(password);
  });

  it('should compare the passwords', async () => {
    const password = 'password123';

    const encryptedPassword = await encryptPassword(password);

    const isMatch = await comparePasswords(password, encryptedPassword);
    expect(isMatch).toBeTruthy();
  });
});
