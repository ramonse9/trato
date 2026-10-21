import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EtapaComercial, NivelInteres } from '../../generated/prisma/client.js';

export class ListRecordsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().normalize('NFC') : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(EtapaComercial)
  etapa?: EtapaComercial;

  @IsOptional()
  @IsEnum(NivelInteres)
  nivelInteres?: NivelInteres;

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  archived = false;
}
