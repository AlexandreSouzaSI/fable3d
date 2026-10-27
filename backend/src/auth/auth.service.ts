import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Banco novo, sem nenhum usuário: cria o admin inicial a partir do
  // ADMIN_EMAIL/ADMIN_SENHA, pra dar pra logar logo no primeiro boot.
  async onModuleInit() {
    const total = await this.prisma.usuario.count();
    if (total > 0) return;

    const email = (process.env.ADMIN_EMAIL || 'admin@fable.local')
      .trim()
      .toLowerCase();
    const senha = process.env.ADMIN_SENHA || 'admin123';

    await this.prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email,
        senha: await bcrypt.hash(senha, 10),
        perfil: 'ADMIN',
      },
    });

    this.logger.log(`Usuário admin inicial criado: ${email}`);
  }

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    // Mensagem genérica de propósito — não revela se errou e-mail ou senha.
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException(
        'Acesso desativado. Fale com o administrador.',
      );
    }

    const token = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }

  async me(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nome: true, email: true, perfil: true },
    });

    if (!usuario) throw new UnauthorizedException();

    return usuario;
  }
}
