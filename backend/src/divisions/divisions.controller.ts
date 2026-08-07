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
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Projects / Divisions')
@Controller('admin/divisions')
@UseGuards(AuthGuard)
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active project divisions' })
  async listDivisions() {
    return this.divisionsService.listDivisions();
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new project division' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'key'],
      properties: {
        name: { type: 'string', example: 'Network Operations' },
        key: { type: 'string', example: 'NTC' },
        description: { type: 'string', example: 'Network tracker & fiber optics' },
        deadline: { type: 'string', example: '2026-12-31' },
      },
    },
  })
  async createDivision(@Body() body: any) {
    return this.divisionsService.createDivision(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing project division' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Division Name' },
        key: { type: 'string', example: 'UPD' },
        description: { type: 'string', example: 'Updated description' },
        deadline: { type: 'string', example: '2026-12-31' },
      },
    },
  })
  async updateDivision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.divisionsService.updateDivision(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project division' })
  @ApiParam({ name: 'id', example: 1 })
  async deleteDivision(@Param('id', ParseIntPipe) id: number) {
    return this.divisionsService.deleteDivision(id);
  }
}
