import {
  Body,
  StreamableFile,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SimulacoesService } from './simulacoes.service';

@Controller('simulacoes')
export class SimulacoesController {
  constructor(private readonly service: SimulacoesService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  /** Baixa o PDF da simulação (valores da data em que foi salva). */
  @Get(':id/pdf')
  async pdf(@Param('id') id: string) {
    const { arquivo, nome } = await this.service.pdf(id);
    return new StreamableFile(arquivo, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nome}"`,
      length: arquivo.length,
    });
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }

  @Post()
  criar(@Body() corpo: Record<string, unknown>) {
    return this.service.criar(corpo);
  }

  @Post(':id/duplicar')
  duplicar(@Param('id') id: string) {
    return this.service.duplicar(id);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() corpo: Record<string, unknown>) {
    return this.service.atualizar(id, corpo);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.service.excluir(id);
  }
}
