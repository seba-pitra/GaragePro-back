import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class UnoccupyReservationDto {
  @IsString()
  @MaxLength(100)
  actualExitTime: string;

  @IsBoolean()
  isPaid: boolean;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
