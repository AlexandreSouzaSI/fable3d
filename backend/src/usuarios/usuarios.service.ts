import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './usuarios.dto';

const SELECT_PUBLICO = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  createdAt: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.usuario.findMany({
      select: SELECT_PUBLICO,
      orderBy: { createdAt: 'asc' },
    });
  }

  async criar(dto: CriarUsuarioDto) {
    if (!dto?.email || !dto?.senha) {
      throw new BadRequestException('E-mail e senha são obrigatórios');
    }

    const email = dto.email.trim().toLowerCase();
    const existe = await this.prisma.usuario.findUnique({ where: { email } });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email,
        senha: await bcrypt.hash(dto.senha, 10),
        perfil: dto.perfil ?? 'FUNCIONARIO',
      },
      select: SELECT_PUBLICO,
    });
  }

  async atualizar(id: string, dto: AtualizarUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: dto.nome,
        perfil: dto.perfil,
        ativo: dto.ativo,
        ...(dto.senha ? { senha: await bcrypt.hash(dto.senha, 10) } : {}),
      },
      select: SELECT_PUBLICO,
    });
  }
}
