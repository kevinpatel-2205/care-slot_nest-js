import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 'clx1234abcd',
    description: 'Doctor ID to review',
  })
  @IsNotEmpty()
  @IsString()
  doctorId!: string;

  @ApiProperty({
    example: 4,
    description: 'Rating between 1 to 5',
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example: 'Very good doctor, explained everything clearly',
    description: 'Optional review comment max 1000 characters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
