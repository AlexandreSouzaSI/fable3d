import { api } from './api';

/**
 * Baixa o PDF de uma simulação. Usa o axios (e não um link direto) porque a
 * rota exige o token de login no cabeçalho.
 */
export async function baixarPdfSimulacao(id: string, nomeSugerido: string) {
    const r = await api.get<Blob>(`/simulacoes/${id}/pdf`, { responseType: 'blob' });
    const disposicao = String(r.headers['content-disposition'] ?? '');
    const nome = /filename="([^"]+)"/.exec(disposicao)?.[1] ?? `${nomeSugerido}.pdf`;
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
