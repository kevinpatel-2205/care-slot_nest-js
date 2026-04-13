import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty()
  currentPassword!: string;

  @MinLength(8)
  newPassword!: string;
}
