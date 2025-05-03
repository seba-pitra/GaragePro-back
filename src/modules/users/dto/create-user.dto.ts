import {
  IsAlpha,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsAlpha('en-US', { message: 'The first name must have only letters' })
  @MaxLength(255)
  firstName: string;

  @IsString()
  @IsAlpha('en-US', { message: 'The last name must have only letters' })
  @MaxLength(255)
  lastName: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'The password must have a Uppercase, lowercase letter and a number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  phone: string;
}
