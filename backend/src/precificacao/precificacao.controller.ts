import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrecificacaoService } from './precificacao.service';

@Controller('precificacao')
export class PrecificacaoController {
  constructor(private readonly service: PrecificacaoService) {}

  /**
   * Calcula sem salvar (pré-visualização da calculadora). Erros de
   * validação voltam com 200 e ok=false, para a tela mostrar por campo.
   */
  @Post('calcular')
  @HttpCode(200)
  calcular(@Body() corpo: Record<string, unknown>) {
    return this.service.calcular(corpo);
  }
}
