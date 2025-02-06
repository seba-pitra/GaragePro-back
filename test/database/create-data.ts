import { User } from '@/modules/auth/entities/user.entity';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';
import { DataSource } from 'typeorm';

export const createVehiclesData = async (datasource: DataSource) => {
  const result = await datasource
    .createQueryBuilder()
    .insert()
    .into(User)
    .values({
      firstName: 'test_user',
      lastName: 'test_lastnma',
      email: 'testMail01@gmail.com',
      password: 'testPassword1',
      phone: '1111611111',
    })
    .returning('*')
    .execute();

  const user = result.raw[0];

  const arrayVehicles = [];
  for (let i = 0; i < 5; i++) {
    arrayVehicles.push({
      color: 'Black',
      model: 'Range Rover',
      plate_number: `FE 6A${i} TEST`,
      user: user,
    });
  }

  await datasource.createQueryBuilder().insert().into(Vehicle).values(arrayVehicles).execute();

  const vehicles = await datasource
    .getRepository(Vehicle)
    .createQueryBuilder('vehicles')
    .where('vehicles.user_id = :userId', { userId: user.id })
    .getMany();

  return { vehicles, user };
};
