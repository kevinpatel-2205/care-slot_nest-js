import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDoctorsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}
