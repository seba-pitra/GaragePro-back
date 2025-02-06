import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset: number;
}
