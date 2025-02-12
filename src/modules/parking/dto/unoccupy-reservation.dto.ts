import { IsString, MaxLength } from 'class-validator';

export class UnoccupyReservationDto {
  @IsString()
  @MaxLength(100)
  actualExitTime: string;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
