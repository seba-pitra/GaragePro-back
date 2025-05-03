import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @Type(() => Number)
  @IsNumber()
  durationInMinutes: number;

  @IsString()
  @MaxLength(100)
  entryTime: string;

  @IsString()
  @MaxLength(100)
  exitTime: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  basicCost: number;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
