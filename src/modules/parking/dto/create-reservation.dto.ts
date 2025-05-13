import { IsString, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MaxLength(100)
  entryTime: string;

  @IsString()
  @MaxLength(100)
  exitTime: string;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
