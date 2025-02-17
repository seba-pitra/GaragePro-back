import { PartialType } from '@nestjs/mapped-types';
import { CreateParkingSlotDto } from './create-parking-slot.dto';

export class UpdateParkingSlotDto extends PartialType(CreateParkingSlotDto) {
  slotCode?: string;
  IsReserved?: boolean;
  IsPreReserved?: boolean;
}
