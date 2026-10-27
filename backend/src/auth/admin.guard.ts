import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

// Só perfil ADMIN passa. Roda depois do JwtAuthGuard global.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (req.user?.perfil !== 'ADMIN') {
      throw new ForbiddenException('Acesso restrito ao administrador.');
    }

    return true;
  }
}
