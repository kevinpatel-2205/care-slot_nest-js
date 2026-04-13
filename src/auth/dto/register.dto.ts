import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone!: string;
}
