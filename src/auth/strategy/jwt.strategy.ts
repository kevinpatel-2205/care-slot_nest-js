import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret') ?? 'dev-secret-key',
    });
  }
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return { userId: payload.userId, role: payload.role };
  }
}
