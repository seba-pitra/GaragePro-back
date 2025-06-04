import { IsString, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MaxLength(100)
  entryDate: string;

  @IsString()
  @MaxLength(100)
  entryHour: string;

  @IsString()
  @MaxLength(100)
  exitDate: string;

  @IsString()
  @MaxLength(100)
  exitHour: string;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
