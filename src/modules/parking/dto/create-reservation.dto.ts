import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @Type(() => Number)
  @IsNumber()
  durationInMinutes: number;

  @IsString()
  @MaxLength(100)
  actualEntryTime: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  basicCost: number;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
