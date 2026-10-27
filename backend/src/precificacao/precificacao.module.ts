import { Module } from '@nestjs/common';
import { MateriaisModule } from '../materiais/materiais.module';
import { PrecificacaoController } from './precificacao.controller';
import { PrecificacaoService } from './precificacao.service';

@Module({
  imports: [MateriaisModule],
  controllers: [PrecificacaoController],
  providers: [PrecificacaoService],
  exports: [PrecificacaoService],
})
export class PrecificacaoModule {}
