import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRecordDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().normalize('NFC') : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombreNegocio!: string;
}
