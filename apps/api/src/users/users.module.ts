import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // Import the new controller

@Module({
  controllers: [UsersController], // Add the UsersController
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}


