import { Controller, Post, Body, Get, Query, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Auth } from './decorators/auth.decorator';
import { ValidRoles } from './interfaces/valid-roles.interface';
import { PaginationDto } from '@/common/dtos/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('/register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('/login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @Get('/')
  @Auth(ValidRoles.employee, ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto);
  }

  @Get('/:email')
  @Auth(ValidRoles.employee, ValidRoles.admin)
  findOneByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Patch('/:email')
  @Auth(ValidRoles.employee, ValidRoles.admin)
  update(@Param('email') email: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(email, updateUserDto);
  }

  @Delete('/:email')
  @Auth(ValidRoles.employee, ValidRoles.admin)
  delete(@Param('email') email: string) {
    return this.userService.delete(email);
  }
}
