import { IsNumber, Min, Max } from 'class-validator';

export class UpdateCommissionDto {
  @IsNumber()
  @Min(5)
  @Max(35)
  commission!: number;
}
