import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfiguracoesService } from './configuracoes.service';

@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly service: ConfiguracoesService) {}

  @Get()
  obter() {
    return this.service.obter();
  }

  @Put()
  salvar(@Body() corpo: Record<string, unknown>) {
    return this.service.salvar(corpo);
  }
}
