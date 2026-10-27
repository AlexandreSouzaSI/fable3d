import { BadRequestException } from '@nestjs/common';

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

/** Erro 400 padronizado: { message, erros: [{ campo, mensagem }] }. */
export function erroValidacao(
  erros: ErroCampo[],
  message = 'Verifique os campos destacados.',
) {
  return new BadRequestException({ statusCode: 400, message, erros });
}

/** Converte Decimal do Prisma (ou number/string) em number. */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v as any);
}

export function numOuNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return Number(v as any);
}

/** Cópia "JSON pura" de um objeto — para gravar em colunas Json do Prisma. */
export function paraJson<T>(v: T): any {
  return JSON.parse(JSON.stringify(v));
}

/**
 * Leitor de corpo de requisição que acumula erros por campo, em vez de
 * parar no primeiro — a tela consegue destacar todos de uma vez.
 */
export class LeitorCampos {
  readonly erros: ErroCampo[] = [];

  constructor(private readonly corpo: Record<string, unknown>) {}

  presente(campo: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.corpo ?? {}, campo);
  }

  texto(
    campo: string,
    rotulo: string,
    opts: { obrigatorio?: boolean; max?: number } = {},
  ): string | null {
    const bruto = this.corpo?.[campo];
    if (bruto === null || bruto === undefined || bruto === '') {
      if (opts.obrigatorio)
        this.erros.push({ campo, mensagem: `${rotulo} é obrigatório.` });
      return null;
    }
    if (typeof bruto !== 'string') {
      this.erros.push({ campo, mensagem: `${rotulo} inválido.` });
      return null;
    }
    const t = bruto.trim();
    if (!t) {
      if (opts.obrigatorio)
        this.erros.push({ campo, mensagem: `${rotulo} é obrigatório.` });
      return null;
    }
    const max = opts.max ?? 500;
    if (t.length > max) {
      this.erros.push({
        campo,
        mensagem: `${rotulo} deve ter no máximo ${max} caracteres.`,
      });
      return null;
    }
    return t;
  }

  numero(
    campo: string,
    rotulo: string,
    opts: {
      obrigatorio?: boolean;
      min?: number;
      maiorQueZero?: boolean;
      max?: number;
      inteiro?: boolean;
    } = {},
  ): number | null {
    const bruto = this.corpo?.[campo];
    if (bruto === null || bruto === undefined || bruto === '') {
      if (opts.obrigatorio)
        this.erros.push({ campo, mensagem: `${rotulo} é obrigatório.` });
      return null;
    }
    const v =
      typeof bruto === 'number'
        ? bruto
        : typeof bruto === 'string'
          ? Number(bruto)
          : NaN;
    if (!Number.isFinite(v)) {
      this.erros.push({
        campo,
        mensagem: `${rotulo} deve ser um número válido.`,
      });
      return null;
    }
    if (opts.inteiro && !Number.isInteger(v)) {
      this.erros.push({
        campo,
        mensagem: `${rotulo} deve ser um número inteiro.`,
      });
      return null;
    }
    if (opts.maiorQueZero && v <= 0) {
      this.erros.push({
        campo,
        mensagem: `${rotulo} deve ser maior que zero.`,
      });
      return null;
    }
    const min = opts.min ?? 0;
    if (v < min) {
      this.erros.push({ campo, mensagem: `${rotulo} não pode ser negativo.` });
      return null;
    }
    if (opts.max !== undefined && v > opts.max) {
      this.erros.push({
        campo,
        mensagem: `${rotulo} deve ser no máximo ${opts.max}.`,
      });
      return null;
    }
    return v;
  }

  booleano(campo: string, rotulo: string): boolean | null {
    const bruto = this.corpo?.[campo];
    if (bruto === null || bruto === undefined) return null;
    if (typeof bruto !== 'boolean') {
      this.erros.push({ campo, mensagem: `${rotulo} inválido.` });
      return null;
    }
    return bruto;
  }

  opcao<T extends string>(
    campo: string,
    rotulo: string,
    opcoes: readonly T[],
    obrigatorio = true,
  ): T | null {
    const bruto = this.corpo?.[campo];
    if (bruto === null || bruto === undefined || bruto === '') {
      if (obrigatorio)
        this.erros.push({ campo, mensagem: `${rotulo} é obrigatório.` });
      return null;
    }
    if (!opcoes.includes(bruto as T)) {
      this.erros.push({ campo, mensagem: `${rotulo} inválido.` });
      return null;
    }
    return bruto as T;
  }

  /** Lança 400 se algum campo tiver erro. */
  validar() {
    if (this.erros.length) throw erroValidacao(this.erros);
  }
}
