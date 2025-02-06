import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';

config({ path: '.env.test' });

export const createTestDatabase = () =>
  new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Vehicle, User],
    synchronize: true,
  });
