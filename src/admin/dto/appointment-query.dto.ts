import { IsEnum, IsOptional } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { PaginationDto } from './pagination.dto';

export class AppointmentQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
