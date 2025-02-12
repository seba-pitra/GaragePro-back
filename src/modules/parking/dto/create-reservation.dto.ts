import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @Type(() => Number)
  @IsNumber()
  durationInMinutes: number;

  @IsString()
  @MaxLength(100)
  actualEntryTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actualExitTime: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  basicCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  penalty: number;

  @IsString()
  @MaxLength(100)
  slotCode: string;
}
