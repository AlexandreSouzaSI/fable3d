import axios from 'axios';
import type { ErroCampo } from '../lib/tipos';

// Extrai a mensagem de erro que o backend NestJS devolve (body.message),
// com um texto padrão quando não vier nada útil.
export function mensagemErro(err: unknown, padrao: string): string {
    if (axios.isAxiosError(err)) {
        if (!err.response) return 'Não foi possível falar com o servidor. Verifique se a API está no ar.';
        const msg = err.response.data?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (typeof msg === 'string' && msg) return msg;
    }
    return padrao;
}

/** Erros por campo ({ campo, mensagem }) devolvidos pela API em respostas 400. */
export function errosDeCampo(err: unknown): Record<string, string> {
    if (axios.isAxiosError(err)) {
        const lista = err.response?.data?.erros as ErroCampo[] | undefined;
        if (Array.isArray(lista)) return mapaErros(lista);
    }
    return {};
}

export function mapaErros(lista: ErroCampo[]): Record<string, string> {
    const mapa: Record<string, string> = {};
    for (const e of lista) if (!mapa[e.campo]) mapa[e.campo] = e.mensagem;
    return mapa;
}
