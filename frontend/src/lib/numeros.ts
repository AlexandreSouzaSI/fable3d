/**
 * Formatação e leitura de números no padrão brasileiro.
 *
 * Os cálculos NUNCA usam texto formatado: a tela guarda o que a pessoa
 * digitou (string), converte com `lerNumero` antes de enviar à API e só
 * formata de volta para exibir.
 */

/**
 * Mesma regra do motor de cálculo no backend (calculo.ts): centavos,
 * metade para longe do zero, sem ruído de ponto flutuante.
 */
export function arredondarMoeda(valor: number): number {
    if (!Number.isFinite(valor)) return valor;
    const sinal = valor < 0 ? -1 : 1;
    const centavos = Number((Math.abs(valor) * 100).toPrecision(15));
    return (sinal * Math.round(centavos)) / 100;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
    return moeda.format(arredondarMoeda(valor));
}

/** Para custos muito pequenos (ex.: R$/g), mostra mais casas. */
export function formatarMoedaPrecisa(valor: number | null | undefined, casas = 4): string {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: casas,
    }).format(valor);
}

export function formatarNumero(valor: number | null | undefined, casas = 2): string {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(valor);
}

/** Recebe FRAÇÃO (0,2) e mostra "20,0%". */
export function formatarPercentual(fracao: number | null | undefined, casas = 1): string {
    if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return '—';
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
    }).format(fracao);
}

/** 135 min → "2 h 15 min". */
export function formatarHoras(horas: number | null | undefined): string {
    if (horas === null || horas === undefined || !Number.isFinite(horas)) return '—';
    const totalMin = Math.round(horas * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatarData(iso: string | Date): string {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Lê o que a pessoa digitou. Aceita "1.234,56", "1234,56", "1234.56" e
 * "R$ 12,90". Regra: se houver vírgula, ela é o decimal e os pontos são
 * milhar; sem vírgula, um único ponto é decimal.
 *
 * Retorna null para campo vazio e NaN para texto inválido.
 */
export function lerNumero(texto: string | null | undefined): number | null {
    if (texto === null || texto === undefined) return null;
    let t = texto.replace(/R\$|%|\s/g, '');
    if (t === '') return null;
    if (t.includes(',')) {
        t = t.replace(/\./g, '').replace(',', '.');
    } else if ((t.match(/\./g) ?? []).length > 1) {
        t = t.replace(/\./g, '');
    }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) return NaN;
    return Number(t);
}

/** Número → texto para preencher um campo ("0,9"). Sem separador de milhar. */
export function paraCampo(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
    return String(Number(valor.toPrecision(12))).replace('.', ',');
}
