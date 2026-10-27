# PROJETO FABLE — Precificação de Impressão 3D

Sistema web para calcular custo e preço de venda de peças impressas em 3D (unitárias e lotes), cadastrar
filamentos, manter parâmetros de custo e salvar simulações com os valores da data do cálculo.

Stack no mesmo padrão do Controle Rota / Controle NF: **NestJS + Prisma + PostgreSQL** no backend,
**React + Vite + Tailwind** no frontend e **Docker Compose** para subir tudo.

```
PROJETO FABLE/
├── backend/
│   ├── prisma/                      schema + migrations
│   └── src/
│       ├── precificacao/motor/      ⭐ motor de cálculo (puro, testado)
│       ├── precificacao/snapshot.ts retrato da simulação (puro, testado)
│       ├── materiais/  configuracoes/  simulacoes/  auth/  usuarios/
│       └── common/validacao.ts
├── frontend/src/
│   ├── pages/       Início, Calculadora, Materiais, Configurações, Simulações, Detalhe
│   ├── components/  ResultadoPainel, ui (campos, modal, confirmação)
│   └── lib/         numeros.ts (formatação pt-BR), tipos.ts
├── docker-compose.yml
└── .env.example
```

## Decisões de arquitetura

- **Postgres + Nest em vez de Supabase.** Mesmo padrão dos outros projetos, sem serviço externo. Os dados
  ficam salvos de verdade no Postgres. Toda rota exige login (JWT, guard global), e o navegador não recebe
  nenhuma credencial do banco. O RLS do Supabase não se aplica: quem controla o acesso é a API.
- **Motor de cálculo isolado** em `backend/src/precificacao/motor/calculo.ts`. É TypeScript puro, sem banco
  e sem HTTP. O frontend não calcula nada: chama `POST /precificacao/calcular`. Só existe uma fonte de verdade.
- **Retrato (snapshot) em cada simulação.** Quando você salva, o sistema grava em JSON todos os valores usados
  (dados e custo por grama do material, tempos, taxas, margem, despesa fixa) e o resultado completo. Ao
  consultar, nada é recalculado a partir do cadastro atual.
- **Precisão.** Os cálculos usam `number` (ponto flutuante de 64 bits), e os resultados vão sem arredondamento
  para o banco e para a tela. O arredondamento para centavos acontece só na exibição: metade para longe do zero
  (50,175 → 50,18), corrigindo o ruído de ponto flutuante. Os percentuais são tratados em pontos percentuais
  (12,5 = 12,5%).

## Como rodar

### Docker (tudo junto)

```bash
cp .env.example .env     # preencha JWT_SECRET, ADMIN_EMAIL, ADMIN_SENHA
docker compose up -d --build
```

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:3021 |
| API | http://localhost:4002 (`/health`) |
| Postgres | localhost:`DB_PORT` (padrão 5450) |

As migrations rodam sozinhas ao subir o backend (`prisma migrate deploy`). O usuário admin é criado no
primeiro boot, com o banco vazio, a partir de `ADMIN_EMAIL` / `ADMIN_SENHA`.

### Modo desenvolvimento

```bash
docker compose up -d postgres_fable

cd backend
npm install
npx prisma migrate dev      # aplica as migrations no banco local
npm run start:dev           # http://localhost:3000

cd ../frontend
npm install
# frontend/.env → VITE_API_URL=http://localhost:3000
npm run dev                 # http://localhost:5173
```

### Variáveis de ambiente

| Arquivo | Variável | Para que serve |
|---|---|---|
| `.env` (raiz, Docker) | `POSTGRES_PASSWORD`, `DB_PORT` | Banco do container |
| | `JWT_SECRET` | Assina os tokens de login (obrigatório) |
| | `ADMIN_EMAIL`, `ADMIN_SENHA` | Usuário criado no primeiro boot |
| | `VITE_API_URL` | URL da API embutida no build do front |
| `backend/.env` (dev) | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*` | Backend fora do Docker |
| `frontend/.env` (dev) | `VITE_API_URL` | API usada pelo `npm run dev` |

## Testes

```bash
cd backend
npm test
```

São 41 testes em 3 arquivos:

- `precificacao/motor/calculo.spec.ts` cobre as fórmulas e as validações.
- `precificacao/snapshot.spec.ts` cobre o retrato da simulação.
- `simulacoes/simulacoes.service.spec.ts` testa o serviço com um banco em memória: salva, altera o material e
  confere que a simulação não mudou.

Cenários obrigatórios cobertos: (1) peça completa, (2) lote com preparação única, (3) perdas, (4) taxas e
margens diferentes, (5) denominador ≤ 0, (6) quantidade ≤ 0, (7) peso ≤ 0, (8) campos opcionais ausentes,
(9) arredondamento e (10) alteração do material sem efeito retroativo.

## Fórmulas

| | Fórmula |
|---|---|
| Custo por grama | (preço do rolo + frete, **se não estiver incluso**) ÷ peso líquido |
| A. Material | peso líquido × (1 + % perda) × custo/g — **ou** peso total já com perdas × custo/g |
| B. Energia (estimativa) | kW × horas de impressão × R$/kWh |
| C. Máquina | horas de impressão × R$/h de manutenção e desgaste (sem energia) |
| D. Trabalho | minutos ÷ 60 × R$/h — preparação **1× por pedido**; acabamento e montagem **por peça** |
| E. Custo total do lote | Σ custos por peça × quantidade + custos únicos do pedido + despesa fixa alocada |
| F. Custo unitário completo | custo total do lote ÷ quantidade |
| G. Preço recomendado | custo unitário completo ÷ (1 − taxas − impostos − outras variáveis − margem) |
| Preço de equilíbrio | custo unitário completo ÷ (1 − taxas − impostos − outras variáveis) |

Se o denominador for zero ou negativo, o sistema não gera preço e mostra um aviso. A margem é sobre o preço de
venda. O markup sobre o custo aparece à parte, só como referência.

## Exemplo manual (fictício) para conferir

Esse é o mesmo cenário do botão **Preencher exemplo fictício** da calculadora. Para usá-lo, crie antes o
material de exemplo na tela Início.

| Passo | Conta | Valor |
|---|---|---|
| Custo por grama | (120,00 + 20,00) ÷ 1000 g | R$ 0,14/g |
| Material | 50 g × 1,10 = 55 g × 0,14 | R$ 7,70 |
| Energia | 0,15 kW × 3 h × R$ 0,90 | R$ 0,405 |
| Máquina | 3 h × R$ 1,50 | R$ 4,50 |
| Acabamento | 10 min ÷ 60 × R$ 30 | R$ 5,00 |
| Montagem/embalagem | 5 min ÷ 60 × R$ 30 | R$ 2,50 |
| Embalagem + componentes | 1,50 + 2,00 | R$ 3,50 |
| **Custo direto por peça** | soma | **R$ 23,605** |
| Lote de 10 | 23,605 × 10 | R$ 236,05 |
| Preparação única | 30 min ÷ 60 × R$ 30 (uma vez) | R$ 15,00 |
| Custo de fabricação do lote | 236,05 + 15,00 | R$ 251,05 |
| Despesa fixa | R$ 2.000 ÷ 400 un = 5,00 × 10 | R$ 50,00 |
| **Custo total do lote** | 251,05 + 50,00 | **R$ 301,05** |
| Custo unitário completo | 301,05 ÷ 10 | R$ 30,105 |
| Percentuais | taxa 12% + impostos 6% + outras 2% = 20%; margem 20% | |
| **Preço recomendado** | 30,105 ÷ (1 − 0,20 − 0,20) = 50,175 | **R$ 50,18** |
| Preço de equilíbrio | 30,105 ÷ 0,80 = 37,63125 | R$ 37,63 |
| Receita do lote | 50,175 × 10 | R$ 501,75 |
| Despesas variáveis do lote | 501,75 × 20% | R$ 100,35 |
| Lucro do lote | 501,75 − 301,05 − 100,35 | R$ 100,35 (20%) |
| Markup sobre custo | 50,175 ÷ 30,105 − 1 | 66,7% |

Na tela, o lucro por unidade aparece como R$ 10,04 (10,035 arredondado) e o do lote como R$ 100,35. Os dois são
arredondados separadamente, a partir do valor exato.

## O que funciona

- Cadastro e edição de materiais, com status ativo/inativo, custo por grama e regra do frete incluso.
- Configurações de custos, incluindo os dois métodos de despesa fixa.
- Calculadora com resultado em tempo real, validação por campo, comparação com o preço atual e aviso de
  percentuais incompatíveis.
- Simulações: salvar, listar, buscar, consultar os valores congelados, editar nome e observações, duplicar,
  excluir com confirmação e "usar como base" (abre na calculadora com o custo atual do material).
- Login obrigatório e layout para celular (barra inferior) e computador (barra lateral).

## O que depende de você

- Preencher as configurações reais (tarifa, consumo, hora de trabalho, despesas, impostos). Os percentuais
  tributários dependem do regime da empresa e não são presumidos pelo sistema.
- O material "PLA Branco (EXEMPLO FICTÍCIO)" é só para teste. Desative-o quando cadastrar os seus.
