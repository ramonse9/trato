import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  NivelInteres,
  TipoActividad,
  TipoTarea,
} from '../../generated/prisma/client.js';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function requiredText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().normalize('NFC') : value;
}

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().normalize('NFC');
  return normalized || null;
}

export class CreateTaskInputDto {
  @Transform(({ value }) => requiredText(value))
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  descripcion!: string;

  @IsEnum(TipoTarea)
  tipo!: TipoTarea;

  @Matches(CALENDAR_DATE)
  fechaVencimiento!: string;
}

export class CreateActivityDto {
  @IsUUID()
  solicitudId!: string;

  @IsEnum(TipoActividad)
  tipo!: TipoActividad;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  ocurridaEn!: string;

  @Transform(({ value }) => requiredText(value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  resumen!: string;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultado?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTaskInputDto)
  proximaAccion?: CreateTaskInputDto;

  @IsOptional()
  @IsEnum(NivelInteres)
  nivelInteres?: NivelInteres;
}

export class CreateTaskDto extends CreateTaskInputDto {
  @IsUUID()
  solicitudId!: string;
}

export class UpdateTaskDto {
  @IsUUID()
  solicitudId!: string;

  @Transform(({ value }) => requiredText(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @IsOptional()
  @Matches(CALENDAR_DATE)
  fechaVencimiento?: string;
}

export class CompleteTaskDto {
  @IsUUID()
  solicitudId!: string;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultado?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTaskInputDto)
  siguienteTarea?: CreateTaskInputDto;
}
