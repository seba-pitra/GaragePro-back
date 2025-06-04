import { CreateReservationDto } from '@/modules/parking/dto/create-reservation.dto';

export const getCreateReservationDto = (slot: string): CreateReservationDto => {
  const entry = new Date();
  entry.setSeconds(entry.getSeconds() + 10);
  const exit = new Date(entry);
  exit.setHours(exit.getHours() + 1);

  const createReservationDto: CreateReservationDto = {
    entryDate: `${entry.getFullYear()}-${(entry.getMonth() + 1).toString().padStart(2, '0')}-${(
      entry.getDate() + 1
    )
      .toString()
      .padStart(2, '0')}`,
    exitDate: `${exit.getFullYear()}-${(exit.getMonth() + 1).toString().padStart(2, '0')}-${(
      exit.getDate() + 1
    )
      .toString()
      .padStart(2, '0')}`,
    entryHour: '08:00',
    exitHour: '09:00',
    slotCode: slot,
  };
  return createReservationDto;
};
