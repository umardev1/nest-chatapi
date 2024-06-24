import { Controller, Get } from '@nestjs/common';

@Controller('home')
export class HomeController {
  @Get()
  findAll(): string {
    return 'This action returns all homes';
  }
}
