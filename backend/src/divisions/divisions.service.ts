import { Injectable, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DivisionsService {
  constructor(private prisma: PrismaService) {}

  // GET /api/admin/divisions (List all projects)
  async listDivisions() {
    return this.prisma.division.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { issues: true } } },
    });
  }

  // POST /api/admin/divisions
  async createDivision(body: any) {
    const { name, key, description, deadline } = body;

    if (!name?.trim()) {
      throw new BadRequestException('Project name is required');
    }
    if (!key?.trim()) {
      throw new BadRequestException('Project key is required');
    }

    const cleanKey = key.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(cleanKey)) {
      throw new BadRequestException('Project key must be 2 to 6 alphanumeric characters (e.g. HRM)');
    }

    try {
      return await this.prisma.division.create({
        data: {
          name: name.trim(),
          key: cleanKey,
          description: description?.trim() || null,
          deadline: deadline ? new Date(deadline) : null,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        const target = e.meta?.target || [];
        if (target.includes('key')) {
          throw new ConflictException('A project with this key already exists');
        }
        throw new ConflictException('A project with this name already exists');
      }
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  // PATCH /api/admin/divisions/:id
  async updateDivision(id: number, body: any) {
    const { name, key, description, deadline } = body;

    if (!name?.trim()) {
      throw new BadRequestException('Project name is required');
    }
    if (!key?.trim()) {
      throw new BadRequestException('Project key is required');
    }

    const cleanKey = key.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(cleanKey)) {
      throw new BadRequestException('Project key must be 2 to 6 alphanumeric characters (e.g. HRM)');
    }

    try {
      return await this.prisma.division.update({
        where: { id },
        data: {
          name: name.trim(),
          key: cleanKey,
          description: description?.trim() || null,
          deadline: deadline ? new Date(deadline) : null,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        const target = e.meta?.target || [];
        if (target.includes('key')) {
          throw new ConflictException('A project with this key already exists');
        }
        throw new ConflictException('A project with this name already exists');
      }
      throw new InternalServerErrorException('Failed to update project');
    }
  }

  // DELETE /api/admin/divisions/:id
  async deleteDivision(id: number) {
    try {
      // Nullify projectDivisionId on related issues before deleting
      await this.prisma.issue.updateMany({
        where: { projectDivisionId: id },
        data: { projectDivisionId: null },
      });

      await this.prisma.division.delete({ where: { id } });
      return { success: true };
    } catch {
      throw new InternalServerErrorException('Failed to delete project');
    }
  }
}
