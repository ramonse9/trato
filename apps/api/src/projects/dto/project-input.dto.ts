import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().normalize('NFC') : value;
}

export class ProjectInputDto {
  @Transform(({ value }) => normalizeText(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nombre!: string;

  @Transform(({ value }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;
}
