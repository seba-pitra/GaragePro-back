import { IsString, MaxLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(100)
  plateNumber: string;

  @IsString()
  @MaxLength(255)
  model: string;

  @IsString()
  @MaxLength(100)
  color: string;
}
