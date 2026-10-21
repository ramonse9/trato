import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRecordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  nombreNegocio!: string;
}
