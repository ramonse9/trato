import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
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

function optionalCoordinate(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'number' ? value : Number(value);
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

  @Transform(({ value }) => optionalCoordinate(value))
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitud?: number | null;

  @Transform(({ value }) => optionalCoordinate(value))
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitud?: number | null;

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
