import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'oldpassword123',
    description: 'Current password',
  })
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'newpassword456',
    description: 'New password minimum 8 characters',
  })
  @MinLength(8)
  newPassword!: string;
}
