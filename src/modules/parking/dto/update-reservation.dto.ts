import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Status } from '../interfaces/reservation.interface';

export class UpdateReservationDto {
  @IsOptional()
  @MaxLength(10)
  @IsEnum(Status)
  @IsString()
  status: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationInMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entryTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  exitTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actualEntryTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actualExitTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  basicCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  penalty: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 })
  totalCoast: number;

  @IsOptional()
  @IsString()
  @IsBoolean()
  isPaid: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slotCode: string;
}
