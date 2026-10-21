import { IsEnum, IsOptional, Matches } from 'class-validator';
import { EstadoTarea } from '../../generated/prisma/client.js';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ListFollowUpsQueryDto {
  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @Matches(CALENDAR_DATE)
  desde?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE)
  hasta?: string;
}
