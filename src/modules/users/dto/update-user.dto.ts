import {
  IsAlpha,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ValidRoles } from '../interfaces/valid-roles.interface';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsAlpha('en-US', { message: 'The first name must have only letters' })
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsAlpha('en-US', { message: 'The last name must have only letters' })
  @MaxLength(255)
  lastName: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'The password must have a Uppercase, lowercase letter and a number',
  })
  password?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ValidRoles, { each: true })
  roles?: ValidRoles[];

  @IsOptional()
  @IsBoolean()
  isRegularCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  phone?: string;
}
