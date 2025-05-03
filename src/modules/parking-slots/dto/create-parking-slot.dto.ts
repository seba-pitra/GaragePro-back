import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateParkingSlotDto {
  @IsString()
  @MaxLength(100)
  slotCode: string;
}
