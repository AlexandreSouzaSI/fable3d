import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MateriaisService } from './materiais.service';

@Controller('materiais')
export class MateriaisController {
  constructor(private readonly service: MateriaisService) {}

  @Get()
  listar(@Query('ativos') ativos?: string) {
    return this.service.listar(ativos === 'true');
  }

  @Post('exemplo')
  criarExemplo() {
    return this.service.criarExemplo();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }

  @Post()
  criar(@Body() corpo: Record<string, unknown>) {
    return this.service.criar(corpo);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() corpo: Record<string, unknown>) {
    return this.service.atualizar(id, corpo);
  }
}
