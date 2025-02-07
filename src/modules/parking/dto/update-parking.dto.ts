import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';

export class UpdateParkingDto extends PartialType(CreateReservationDto) {}
