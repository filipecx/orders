import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Flame,
  ChefHat,
  Zap,
  ArrowRight,
  Check,
  CheckCircle2,
  Boxes,
  MessageCircle,
  Calendar,
  Truck,
  ShoppingBag,
} from 'lucide-react'
import {
  LandingFeatureTabs,
  LandingFaq,
} from '@/components/landing-interactive'

export const metadata: Metadata = {
  title: 'AppDrops | O Sistema de Pedidos para Confeitarias e Padarias Artesanais',
  description:
    'Venda suas fornadas e doces com pronta-entrega ou encomendas agendadas. PIX com confirmação automática, dinheiro na sua conta na mesma hora sem retenção, gerenciador de produção do dia e zero mensalidade. Pague apenas 7% se vender!',
  keywords: [
    'sistema para confeitarias',
    'sistema para padarias artesanais',
    'encomendas de bolos e doces',
    'pronta-entrega confeitarias',
    'pré-venda de fornadas',
    'confirmação automatica pix',
    'gerenciador de pedidos cozinha',
  ],
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col selection:bg-neutral-200 selection:text-neutral-900">
      {/* 0. Barra de Anúncio Superior (Oferta Irresistível) */}
      <div className="bg-neutral-900 text-white text-xs py-2.5 px-4 text-center border-b border-neutral-800">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 font-medium flex-wrap">
          <span className="inline-flex items-center gap-1 bg-neutral-800 text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-semibold">
            <Zap className="size-3" /> NOVIDADE
          </span>
          <span>
            <strong>Zero Mensalidade Fixa:</strong> Você só paga se vender e a taxa é de apenas <strong>7%</strong>. Aceite encomendas ou pronta-entrega com PIX direto na sua conta!
          </span>
          <Link
            href="/signup"
            className="underline hover:text-neutral-300 transition-colors inline-flex items-center gap-1 font-semibold ml-1"
          >
            Começar Grátis <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* 1. Navbar Elegante & Minimalista */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-xs">
              <Flame className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg tracking-tight text-neutral-900 leading-none">
                AppDrops
              </span>
              <span className="text-[10px] text-neutral-500 font-medium tracking-tight">
                Confeitarias & Padarias
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600">
            <a href="#pix-automatico" className="hover:text-neutral-900 transition-colors">
              PIX Automático
            </a>
            <a href="#producao-do-dia" className="hover:text-neutral-900 transition-colors">
              Produção do Dia
            </a>
            <a href="#encomendas-pronta-entrega" className="hover:text-neutral-900 transition-colors">
              Encomenda & Pronta-Entrega
            </a>
            <a href="#recursos" className="hover:text-neutral-900 transition-colors">
              Recursos
            </a>
            <a href="#precos" className="hover:text-neutral-900 transition-colors">
              Taxa de 7%
            </a>
            <a href="#duvidas" className="hover:text-neutral-900 transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2"
            >
              Fazer Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs transition-all"
            >
              Criar Loja Grátis
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 2. HERO SECTION - COPYWRITING DIRETO DE ALTA CONVERSÃO */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-neutral-800 border border-neutral-200 shadow-xs">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PIX Automático • Pronta-Entrega & Encomendas • Dinheiro na Mesma Hora</span>
            </div>

            {/* Headline Principal de Venda */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.08] max-w-4xl mx-auto font-heading">
              Venda toda sua produção de doces e fornadas{' '}
              <span className="underline decoration-neutral-300 decoration-wavy underline-offset-8">
                antes mesmo
              </span>{' '}
              de ligar o forno.
            </h1>

            {/* Sub-headline Persuasiva */}
            <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              O sistema pensado sob medida para a realidade de <strong>pequenas confeitarias e padarias artesanais</strong>.
              Aceite <strong>encomendas programadas</strong> com data marcada ou venda na hora a <strong>pronta-entrega</strong>.
              Confirmação automática de PIX, dinheiro direto na sua conta sem dias de retenção, e um gerenciador que calcula
              o total exato de comida a ser feita no dia.
            </p>

            {/* Chamada para Ação (CTAs) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm sm:text-base font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm transition-all group"
              >
                <ChefHat className="size-5" />
                Criar Minha Loja Grátis Agora
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#encomendas-pronta-entrega"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-sm sm:text-base font-semibold rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 transition-colors shadow-xs"
              >
                Ver Encomenda & Pronta-Entrega
              </a>
            </div>

            {/* Micro-copy de quebra de atrito */}
            <p className="text-xs text-neutral-500 font-medium">
              ✨ Sem mensalidade fixa • Sem cartão de crédito • Configure sua loja em menos de 3 minutos
            </p>

            {/* Destaques de Confiança */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-700 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                <span>Pronta-entrega ou encomendas agendadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                <span>PIX automático (sem pedir comprovante)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                <span>Dinheiro na sua conta na mesma hora</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                <span>Taxa única de apenas 7% (zero mensalidade)</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* HERO VISUAL MOCKUP REALISTA (A Dupla Perfeita: Vitrine + Cozinha) */}
            {/* ========================================================================= */}
            <div className="pt-8 max-w-4xl mx-auto text-left">
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-6">
                {/* Header do Mockup */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
                      <Flame className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-neutral-900">
                          PRÉ-VENDA: Fornada Especial de Sábado & Doces
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ● AO VIVO
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Ateliê de Pães Artesanais & Confeitaria Fina
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                        Pedidos encerram em
                      </span>
                      <span className="font-mono font-bold text-sm text-neutral-900">
                        04h 18m restantes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner de Notificação de PIX Imediato */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-900">
                    <div className="size-7 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <Zap className="size-4" />
                    </div>
                    <div>
                      <strong className="block font-semibold">
                        Pagamento PIX Confirmado Automaticamente!
                      </strong>
                      <span className="text-[11px] text-emerald-800">
                        Pedido #1088 de Julia Camargo • R$ 145,00 transferido direto para sua conta bancária sem retenção.
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-900 text-sm bg-white/80 px-2.5 py-1 rounded border border-emerald-200 shrink-0">
                    + R$ 145,00
                  </span>
                </div>

                {/* 2 Colunas: Resumo de Produção do Dia + Vitrine com Combos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Total de comida a fazer no dia (Cozinha) */}
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChefHat className="size-4 text-neutral-800" />
                        <span className="text-xs font-bold text-neutral-900">
                          Total de Comida para Fazer Hoje
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold bg-neutral-200 px-2 py-0.5 rounded text-neutral-800">
                        46 unidades
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/70 space-y-1.5">
                        <div className="flex justify-between font-medium">
                          <span>Pão Rústico de Fermentação Natural</span>
                          <span className="font-mono font-bold text-neutral-900">20/20</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                          <div className="bg-neutral-900 h-full w-[100%]" />
                        </div>
                        <span className="text-[10px] text-emerald-800 font-semibold block">
                          ✅ Fornada 100% vendida e paga
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/70 space-y-1.5">
                        <div className="flex justify-between font-medium">
                          <span>Bolo Caseiro de Cenoura com Brigadeiro</span>
                          <span className="font-mono font-bold text-neutral-900">14/16</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                          <div className="bg-neutral-900 h-full w-[87%]" />
                        </div>
                        <span className="text-[10px] text-neutral-500 block">
                          Restam apenas 2 bolos para esgotar
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Vitrine e Combos Especiais */}
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Boxes className="size-4 text-neutral-800" />
                        <span className="text-xs font-bold text-neutral-900">
                          Combos Especiais & Categorias
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +32% no Ticket Médio
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/70 flex items-center justify-between">
                        <div>
                          <strong className="block text-neutral-900 font-semibold">
                            Combo Brunch de Domingo
                          </strong>
                          <span className="text-[10px] text-neutral-500">
                            1x Pão Artesanal + 1x Geléia + 1x Bolo
                          </span>
                        </div>
                        <span className="font-mono font-bold text-neutral-900">
                          R$ 68,00
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/70 flex items-center justify-between">
                        <div>
                          <strong className="block text-neutral-900 font-semibold">
                            Caixa Degustação de Doces (12un)
                          </strong>
                          <span className="text-[10px] text-neutral-500">
                            Cliente escolhe até 4 sabores finos
                          </span>
                        </div>
                        <span className="font-mono font-bold text-neutral-900">
                          R$ 52,00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer do Mockup com Ação de WhatsApp em 1 clique */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-neutral-600">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-700" />
                    <span>
                      Notificação pronta de WhatsApp para o cliente: <strong>&ldquo;Seu pedido #1088 acabou de sair do forno!&rdquo;</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono bg-neutral-100 text-neutral-800 px-2 py-1 rounded border border-neutral-200">
                    Disparo em 1 clique
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. QUADRO COMPARATIVO: MODO ANTIGO VS. APPDROPS (DOR REAL DO LOJISTA) */}
        {/* ========================================================================= */}
        <section className="py-16 bg-white border-y border-neutral-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                A Diferença na Sua Rotina
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-neutral-900">
                Por que confeitarias e padarias estão abandonando os métodos antigos?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600">
                Trabalhar com comida artesanal exige foco no sabor e na qualidade. Você não pode perder horas administrando cobrança e papelada.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* O Jeito Antigo (Caótico) */}
              <div className="p-6 rounded-2xl bg-neutral-50 border border-rose-200/80 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <span>❌ O Jeito Antigo & Complicado</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900">
                  WhatsApp Caótico & Plataformas que Cobram Mensalidade
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                    <span>
                      Ter que parar a batedeira ou tirar as luvas para conferir se o comprovante de PIX não é falso no aplicativo do banco.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                    <span>
                      Pagar mensalidades fixas de R$ 150 a R$ 300 todo mês, mesmo nas semanas em que você vende menos ou tira folga.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                    <span>
                      Seu dinheiro preso por 14 a 30 dias na plataforma para conseguir sacar, estrangulando seu fluxo de caixa para comprar ingredientes.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0">✕</span>
                    <span>
                      Anotar pedidos em caderno e não saber exatamente quantos pães ou bolos tem que assar, gerando desperdício e atrasos.
                    </span>
                  </li>
                </ul>
              </div>

              {/* O Jeito AppDrops (Lucrativo e Ágil) */}
              <div className="p-6 rounded-2xl bg-white border-2 border-neutral-900 space-y-4 shadow-sm">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>✅ O Jeito AppDrops</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Tudo Automático, Dinheiro na Hora e Zero Mensalidade
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>PIX Confirmado Automaticamente:</strong> O cliente paga pelo QR Code e o pedido é aprovado sozinho na hora.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Dinheiro Direto na Sua Conta:</strong> Sem burocracia e com ZERO tempo de retenção. Cai na mesma hora na sua conta!
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Zero Mensalidade — Apenas 7%:</strong> Você só paga se vender. Se não vender nada no mês, não paga 1 centavo.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Produção do Dia Calculada:</strong> Saiba na ponta do lápis a quantidade exata de cada item para a fornada do dia.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. FUNCIONALIDADES DETALHADAS (INTERATIVAS & PERSUASIVAS) */}
        {/* ========================================================================= */}
        <section id="recursos" className="py-16 sm:py-24 bg-neutral-50 scroll-mt-16">
          <div id="pix-automatico" className="scroll-mt-20" />
          <div id="producao-do-dia" className="scroll-mt-20" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Poder Total Para Seu Negócio
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-heading text-neutral-900">
                Cada detalhe pensado para quem vive da gastronomia
              </h2>
              <p className="text-xs sm:text-base text-neutral-600">
                Clique nas abas abaixo para ver como cada ferramenta simplifica seu dia a dia, acelera suas vendas e traz paz para sua cozinha.
              </p>
            </div>

            {/* Abas Interativas com Mockups */}
            <LandingFeatureTabs />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. DEEP DIVE: O PODER DOS DROPS / PRÉ-VENDAS COMO EVENTOS */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-amber-300 border border-neutral-700">
                  <Flame className="size-3.5" />
                  <span>A Estratégia dos Grandes Produtores</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-heading leading-tight">
                  Crie cardápios especiais de pré-venda que parecem um verdadeiro evento.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Por que ficar esperando clientes aparecerem aleatoriamente se você pode transformar sua fornada em um lançamento disputado?
                </p>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Com o modelo de <strong>Drop</strong> do AppDrops, você define data de abertura, limite de unidades e cronômetro regressivo. Seus clientes correm para comprar antes que acabe, e você já recebe todo o dinheiro no PIX antes mesmo de comprar a farinha e a manteiga.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-neutral-800/80 border border-neutral-700 space-y-1">
                    <span className="font-bold text-white block">Escassez Real</span>
                    <span className="text-neutral-400 text-[11px]">
                      Barra de unidades restantes que faz o cliente comprar sem pensar duas vezes.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-800/80 border border-neutral-700 space-y-1">
                    <span className="font-bold text-white block">Fluxo de Caixa Positivo</span>
                    <span className="text-neutral-400 text-[11px]">
                      Produza sob demanda com 100% dos pedidos já pagos e confirmados.
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-neutral-800 p-5 rounded-2xl border border-neutral-700 space-y-4 text-neutral-900">
                <div className="p-4 rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Drop de Páscoa: Ovos Recheados</span>
                    <span className="text-[10px] font-mono bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-semibold">
                      95% VENDIDO
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    Lote único de 30 caixas artesanais. Pedidos encerram em 2 horas!
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div className="bg-neutral-900 h-full w-[95%]" />
                  </div>
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-rose-700 font-semibold">Apenas 1 unidade restante!</span>
                    <span className="text-neutral-500 font-mono">29/30 reservados</span>
                  </div>
                </div>

                <div className="text-center text-xs text-neutral-300">
                  💡 Ideal para: Fornadas de Pães, Sobremesas de Fim de Semana, Páscoa, Dia das Mães, Festivais e Menus Semanais.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. FLEXIBILIDADE TOTAL: ENCOMENDAS COM DATA MARCADA OU PRONTA-ENTREGA */}
        {/* ========================================================================= */}
        <section
          id="encomendas-pronta-entrega"
          className="py-16 sm:py-24 bg-white border-b border-neutral-200/80 scroll-mt-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                <ShoppingBag className="size-3.5 text-neutral-700" />
                <span>Atenda os Dois Mundos no Mesmo Cardápio</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-heading text-neutral-900">
                Aceite Encomendas Programadas ou Venda a Pronta-Entrega
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Sua confeitaria ou padaria não precisa escolher entre faturar com os itens frescos do dia ou fechar encomendas grandes para o fim de semana. No AppDrops, seus clientes compram das duas formas e sua cozinha nunca se confunde.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Card 1: Pronta-Entrega */}
              <div className="p-7 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-5 flex flex-col justify-between hover:border-neutral-300 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                      <Zap className="size-6 text-emerald-700" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ⚡ Imediato
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900">
                    Pronta-Entrega: Venda o que acabou de sair do forno
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Ideal para fatias de bolo, pães rústicos do dia, brigadeiros, salgados e bebidas. O cliente pede, paga no PIX automático em segundos e retira no balcão ou recebe de motoboy na mesma hora.
                  </p>

                  <ul className="space-y-2.5 text-xs text-neutral-700 pt-2 border-t border-neutral-200/70">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>Estoque em tempo real que evita vender o que já acabou</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>Retirada rápida no balcão ou entrega express via motoboy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>PIX aprovado na hora sem conferência manual de comprovante</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-neutral-600 flex items-center gap-2.5">
                  <Truck className="size-4 text-neutral-500 shrink-0" />
                  <span>Taxa de frete configurável por raio de entrega ou retirada grátis.</span>
                </div>
              </div>

              {/* Card 2: Encomendas Programadas */}
              <div className="p-7 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-5 flex flex-col justify-between hover:border-neutral-300 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                      <Calendar className="size-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-200 text-neutral-800 border border-neutral-300">
                      📅 Agendado
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900">
                    Encomendas: Data e horário marcado pelo cliente
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Perfeito para bolos de aniversário, doces finos de festa, kits presenteáveis e encomendas semanais. O cliente escolhe o dia no calendário e a faixa de horário para retirada ou entrega.
                  </p>

                  <ul className="space-y-2.5 text-xs text-neutral-700 pt-2 border-t border-neutral-200/70">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>Calendário integrado com prazo de antecedência mínimo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>Limite de produção diária para sua cozinha não sobrecarregar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-700 shrink-0" />
                      <span>Pagamento garantido antecipado para comprar insumos caros</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-neutral-600 flex items-center gap-2.5">
                  <ChefHat className="size-4 text-neutral-500 shrink-0" />
                  <span>Cozinha organizada: soma automática da produção do dia marcado.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. PREÇO SIMPLES E CLARO (ZERO MENSALIDADE • SÓ PAGA 7% SE VENDER) */}
        {/* ========================================================================= */}
        <section id="precos" className="py-16 sm:py-20 bg-neutral-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Modelo Justo e Sem Pegadinhas
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-heading text-neutral-900">
                O único sistema onde nós só ganhamos se você vender
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
                Você nunca mais vai ver uma cobrança surpresa no seu cartão. Risco zero para você começar hoje mesmo.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-neutral-900 p-6 sm:p-8 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Plano Profissional</h3>
                  <p className="text-xs text-neutral-500">Para confeitarias, padarias e cozinhas artesanais</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white">
                  Tudo Incluso
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-neutral-900">R$ 0</span>
                  <span className="text-neutral-500 text-sm font-medium">de mensalidade fixa</span>
                </div>
                <div className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="size-4 text-emerald-700" />
                  <span>Taxa única de apenas 7% por pedido faturado</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-700 pt-2 border-t border-neutral-100">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Suporte completo a pronta-entrega e encomendas agendadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Confirmação automática de pagamentos no PIX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Dinheiro direto na sua conta bancária sem retenção</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Resumo de produção do dia (total de comida a fazer)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Gerenciador de pedidos com aviso de WhatsApp em 1 clique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Drops e cardápios especiais de pré-venda com timer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Criação de combos especiais e categorias ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-700 shrink-0" />
                  <span>Dashboard completo com métricas da loja</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Criar Minha Conta Grátis Agora
                <ArrowRight className="size-4" />
              </Link>

              <div className="text-center text-[11px] text-neutral-500">
                🔒 Sem fidelidade • Cancele quando quiser sem multas
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. DÚVIDAS FREQUENTES (FAQ QUEBRA DE OBJEÇÕES) */}
        {/* ========================================================================= */}
        <section id="duvidas" className="py-16 sm:py-24 bg-white border-t border-neutral-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Perguntas Frequentes
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-heading text-neutral-900">
                Tire suas dúvidas antes de começar
              </h2>
            </div>

            {/* Componente Interativo de FAQ */}
            <LandingFaq />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. CTA BANNER FINAL (FECHAMENTO IRRESISTÍVEL) */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-neutral-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-emerald-400 border border-neutral-700">
              <Zap className="size-3.5" />
              <span>Sem Mensalidade • Risco Zero</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight font-heading max-w-2xl mx-auto leading-tight">
              Pronto para vender toda sua próxima fornada antes de acender o forno?
            </h2>

            <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
              Junte-se a confeitarias e padarias que transformaram pedidos no WhatsApp em vendas automáticas, com dinheiro no mesmo minuto na conta e paz na cozinha.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 shadow-sm transition-all group"
              >
                Criar Minha Loja Grátis
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
              >
                Já tenho conta (Entrar)
              </Link>
            </div>

            <p className="text-xs text-neutral-500 pt-2">
              Leva menos de 3 minutos • Sem mensalidade fixa • Você só paga 7% se vender
            </p>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 12. RODAPÉ */}
      {/* ========================================================================= */}
      <footer className="border-t border-neutral-200/80 py-10 bg-white text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white">
                <Flame className="size-4" />
              </div>
              <span className="font-bold text-sm text-neutral-900">AppDrops</span>
              <span>— A plataforma de pré-vendas para confeitarias e padarias</span>
            </div>

            <div className="flex items-center gap-6 font-medium">
              <a href="#pix-automatico" className="hover:text-neutral-900 transition-colors">
                PIX Automático
              </a>
              <a href="#producao-do-dia" className="hover:text-neutral-900 transition-colors">
                Produção do Dia
              </a>
              <a href="#encomendas-pronta-entrega" className="hover:text-neutral-900 transition-colors">
                Encomenda & Pronta-Entrega
              </a>
              <a href="#precos" className="hover:text-neutral-900 transition-colors">
                Taxa de 7%
              </a>
              <Link href="/login" className="hover:text-neutral-900 transition-colors">
                Login
              </Link>
              <Link href="/signup" className="hover:text-neutral-900 transition-colors">
                Criar Conta
              </Link>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400">
            <p>© {new Date().getFullYear()} AppDrops Tecnologia. Feito com amor para pequenos produtores gastronômicos.</p>
            <p>Dinheiro na hora • PIX automático • Sem mensalidade</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
