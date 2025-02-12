import { IsString, MaxLength } from 'class-validator';

export class CreateTotalCostDto {
  @IsString()
  @MaxLength(100)
  actualExitTime: string;
}
