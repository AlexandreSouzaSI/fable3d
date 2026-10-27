-- CreateEnum
CREATE TYPE "MetodoDespesaFixa" AS ENUM ('MANUAL', 'RATEIO');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fabricante" TEXT,
    "tipo" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "pesoLiquidoG" DECIMAL(14,3) NOT NULL,
    "precoRolo" DECIMAL(14,2) NOT NULL,
    "freteAquisicao" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "freteIncluidoNoPreco" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tarifaEnergiaKwh" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "consumoImpressoraKw" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "manutencaoHora" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "custoHoraTrabalho" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "despesasFixasMensais" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unidadesVendidasMes" INTEGER NOT NULL DEFAULT 0,
    "metodoDespesaFixa" "MetodoDespesaFixa" NOT NULL DEFAULT 'MANUAL',
    "despesaFixaManualUnit" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "taxaVendaPct" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "impostosPct" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "outrasVariaveisPct" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "margemLucroPct" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "observacoes" TEXT,
    "quantidade" INTEGER NOT NULL,
    "materialId" TEXT,
    "snapshot" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "custoUnitarioCompleto" DECIMAL(18,6) NOT NULL,
    "precoRecomendadoUnit" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Simulacao_createdAt_idx" ON "Simulacao"("createdAt");

-- AddForeignKey
ALTER TABLE "Simulacao" ADD CONSTRAINT "Simulacao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
