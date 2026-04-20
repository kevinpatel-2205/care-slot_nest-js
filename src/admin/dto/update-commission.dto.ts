import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateCommissionDto {
  @ApiProperty({ example: 15, description: 'Commission percentage between 5-35' })
  @IsNumber()
  @Min(5)
  @Max(35)
  commission!: number;
}
