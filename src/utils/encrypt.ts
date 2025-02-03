import * as bcrypt from 'bcrypt';

export const comparePasswords = async (requestPassword: string, userPassword: string) => {
  const match = await bcrypt.compare(requestPassword, userPassword);
  return match;
};

export const encryptPassword = async (password: string) => {
  const encryptedPassword = await bcrypt.hash(password, 10);
  return encryptedPassword;
};
