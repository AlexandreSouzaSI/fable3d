import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MateriaisModule } from './materiais/materiais.module';
import { ConfiguracoesModule } from './configuracoes/configuracoes.module';
import { PrecificacaoModule } from './precificacao/precificacao.module';
import { SimulacoesModule } from './simulacoes/simulacoes.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsuariosModule,
    MateriaisModule,
    ConfiguracoesModule,
    PrecificacaoModule,
    SimulacoesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
