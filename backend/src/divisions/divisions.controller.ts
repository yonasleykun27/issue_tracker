import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DivisionsService } from './divisions.service';
import { Roles, Public } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';

@Controller('admin/divisions')
@UseGuards(AuthGuard)
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  @Public()
  @Get()
  async listDivisions() {
    return this.divisionsService.listDivisions();
  }

  @Roles('ADMIN')
  @Post()
  async createDivision(@Body() body: any) {
    return this.divisionsService.createDivision(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async updateDivision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.divisionsService.updateDivision(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async deleteDivision(@Param('id', ParseIntPipe) id: number) {
    return this.divisionsService.deleteDivision(id);
  }
}
