import { Module } from '@nestjs/common';
import { PrecificacaoModule } from '../precificacao/precificacao.module';
import { SimulacoesController } from './simulacoes.controller';
import { SimulacoesService } from './simulacoes.service';

@Module({
  imports: [PrecificacaoModule],
  controllers: [SimulacoesController],
  providers: [SimulacoesService],
})
export class SimulacoesModule {}
