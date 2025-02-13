import { DataSource } from 'typeorm';
import { User } from '@/modules/auth/entities/user.entity';
import { ParkingSlot } from '@/modules/parking-slots/entities/parking-slot.entity';
import { CreateParkingSlotDto } from '@/modules/parking-slots/dto/create-parking-slot.dto';
import { ReservationSlot } from '@/modules/parking/entities/reservation-slot.entity';
import { Reservation } from '@/modules/parking/entities/reservation.entity';
import { Vehicle } from '@/modules/vehicles/entities/vehicle.entity';

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

export const createUserData = async (datasource: DataSource) => {
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

  return user;
};

export const createParkingSlotData = async (
  datasource: DataSource,
  createParkingSlotDto?: CreateParkingSlotDto,
) => {
  const data = { slot_code: 'A1', is_reserved: true };

  if (createParkingSlotDto) {
    data.is_reserved = createParkingSlotDto.IsReserved;
    data.slot_code = createParkingSlotDto.slotCode;
  }

  const result = await datasource
    .createQueryBuilder()
    .insert()
    .into(ParkingSlot)
    .values(data)
    .returning('*')
    .execute();

  const parkingSlot = result.raw[0];

  return parkingSlot;
};

export const createReservationData = async (datasource: DataSource) => {
  const user = await createUserData(datasource);
  const parkingSlot = await createParkingSlotData(datasource);

  const result = await datasource
    .createQueryBuilder()
    .insert()
    .into(Reservation)
    .values({
      actual_entry_time: new Date().toISOString(),
      basic_cost: 30.33,
      duration_in_minutes: 60,
      user,
    })
    .returning('*')
    .execute();

  const reservation = result.raw[0];

  const reservationSlot = new ReservationSlot();
  reservationSlot.reservation = reservation;
  reservationSlot.parking_slot = parkingSlot;

  const resultReservationSlot = await datasource
    .createQueryBuilder()
    .insert()
    .into(ReservationSlot)
    .values(reservationSlot)
    .returning('*')
    .execute();

  const reservationSlotResult = resultReservationSlot.raw[0];

  return reservationSlotResult;
};
