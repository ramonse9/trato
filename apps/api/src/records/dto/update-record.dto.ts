import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EtapaComercial, NivelInteres } from '../../generated/prisma/client.js';

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().normalize('NFC');
  return normalized || null;
}

function requiredText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().normalize('NFC') : value;
}

export class UpdateRecordDto {
  @Transform(({ value }) => requiredText(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombreNegocio?: string;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombreEncargado?: string | null;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^\+[1-9]\d{7,14}$/)
  telefono?: string | null;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  correo?: string | null;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  direccion?: string | null;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notasGenerales?: string | null;

  @IsOptional()
  @IsEnum(EtapaComercial)
  etapa?: EtapaComercial;

  @IsOptional()
  @IsEnum(NivelInteres)
  nivelInteres?: NivelInteres;

  @Transform(({ value }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivoDescarte?: string | null;
}
