'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  Clock,
  CheckCircle2,
  ChefHat,
  Flame,
  ShoppingBag,
  Boxes,
  TrendingUp,
  ArrowRight,
  MessageCircle,
  ChevronDown,
  Sparkles,
  Cake,
  Banknote,
} from 'lucide-react'

// ==========================================
// 2. ABAS INTERATIVAS DAS FUNCIONALIDADES
// ==========================================

interface FeatureTab {
  id: string
  label: string
  icon: React.ElementType
  badge: string
  headline: string
  description: string
  highlights: string[]
  previewType: 'pix' | 'kitchen' | 'orders' | 'drops' | 'combos' | 'dashboard'
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'pix',
    label: 'PIX Automático & Sem Retenção',
    icon: Zap,
    badge: 'Dinheiro Imediato',
    headline: 'O dinheiro cai na sua conta na mesma hora. Sem conferir comprovante.',
    description:
      'Esqueça a dor de cabeça de parar a produção para verificar extrato bancário com a mão cheia de farinha ou correr o risco de cair em comprovantes falsos. O cliente paga pelo QR Code ou Copia e Cola e o pedido é aprovado sozinho na hora.',
    highlights: [
      'Validação automática de pagamento em segundos',
      'Dinheiro transferido direto para sua conta bancária',
      'Zero tempo de retenção: não precisa esperar 14 nem 30 dias para sacar',
      'Sem burocracia bancária ou maquininha travando',
    ],
    previewType: 'pix',
  },
  {
    id: 'kitchen',
    label: 'Produção do Dia',
    icon: ChefHat,
    badge: 'Controle de Cozinha',
    headline: 'Saiba exatamente quanto cozinhar no dia. Zero desperdício de insumos.',
    description:
      'Diga adeus a papéis de pão com anotações e mensagens perdidas no WhatsApp. O AppDrops calcula o total consolidado de cada receita para a data da entrega ou retirada da fornada.',
    highlights: [
      'Resumo automático da fornada: soma total de pães, bolos e doces a fazer',
      'Organizado por data de entrega e faixas de horário',
      'Checklist de produção em tempo real na tela do celular ou tablet',
      'Previsibilidade para comprar só a quantidade certa de insumos caros',
    ],
    previewType: 'kitchen',
  },
  {
    id: 'orders',
    label: 'Encomenda & Pronta-Entrega',
    icon: ShoppingBag,
    badge: 'Flexibilidade Total',
    headline: 'Gerenciador com suporte completo a pronta-entrega imediata e encomendas.',
    description:
      'Sua confeitaria ou padaria gerencia tudo no mesmo lugar. Venda fatias, pães frescos e doces do dia para entrega rápida (pronta-entrega), e receba encomendas de bolos e kits agendados para datas futuras sem misturar a produção.',
    highlights: [
      'Pronta-entrega: despacho ou retirada rápida para itens frescos do dia',
      'Encomendas agendadas: cliente escolhe data e faixa de horário de entrega',
      'Visual em colunas claras: Pendente, Em Preparo, Pronto e Despachado',
      'Botão de WhatsApp com mensagem pronta em 1 clique avisando o cliente',
    ],
    previewType: 'orders',
  },
  {
    id: 'drops',
    label: 'Drops & Pré-vendas',
    icon: Flame,
    badge: 'Cardápios Como Evento',
    headline: 'Crie cardápios especiais que parecem um evento e esgotam em horas.',
    description:
      'Transforme suas fornadas de fim de semana, cardápios temáticos (Páscoa, Dia das Mães, Natal) ou lotes especiais em lançamentos disputados com contagem regressiva e limite de unidades.',
    highlights: [
      'Contagem regressiva ao vivo que gera urgência real de compra',
      'Barra de estoque transparente que mostra as últimas unidades',
      'Venda antes de produzir: garantia de que tudo que você assar já está pago',
      'Encerramento automático quando atingir o limite da sua capacidade',
    ],
    previewType: 'drops',
  },
  {
    id: 'combos',
    label: 'Combos & Categorias',
    icon: Boxes,
    badge: 'Aumento de Ticket Médio',
    headline: 'Sua vitrine online, combos especiais e categorias bem organizadas.',
    description:
      'Monte caixas de degustação, kits presenteáveis e dê ao cliente a opção de escolher os sabores favoritos dentro de um combo. Organize seu catálogo por categorias apetitosas.',
    highlights: [
      'Combos flexíveis: "Monte sua caixa com 4 sabores de brigadeiro"',
      'Categorias claras: Bolos Vulcão, Pães Rústicos, Docinhos, Salgados',
      'Vitrine mobile-first ultra rápida para o link da bio do Instagram',
      'Navegação limpa sem exigir que o cliente crie senha ou baixe app',
    ],
    previewType: 'combos',
  },
  {
    id: 'dashboard',
    label: 'Dashboard Completo',
    icon: TrendingUp,
    badge: 'Panorama do Negócio',
    headline: 'Um panorama geral e transparente de tudo o que acontece na sua loja.',
    description:
      'Tenha a visão executiva do seu negócio gastronômico na ponta dos dedos. Acompanhe seu faturamento diário, pedidos confirmados, ticket médio e o andamento das suas pré-vendas.',
    highlights: [
      'Faturamento acumulado em pedidos 100% pagos',
      'Ticket médio calculado em tempo real',
      'Monitoramento de pedidos pendentes x confirmados',
      'Acesso a relatórios e histórico detalhado das fornadas',
    ],
    previewType: 'dashboard',
  },
]

export function LandingFeatureTabs() {
  const [activeTabId, setActiveTabId] = useState<string>('pix')
  const activeTab = FEATURE_TABS.find((t) => t.id === activeTabId) || FEATURE_TABS[0]

  return (
    <div className="space-y-8">
      {/* Abas Superiores - Scroll horizontal no mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start lg:justify-center">
        {FEATURE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all border shrink-0 ${
                isActive
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Lado Esquerdo: Textos & Argumentos (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              <Sparkles className="size-3 text-neutral-600" />
              <span>{activeTab.badge}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 font-heading leading-tight">
              {activeTab.headline}
            </h3>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {activeTab.description}
            </p>

            <ul className="space-y-2.5 pt-2">
              {activeTab.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700">
                  <CheckCircle2 className="size-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Experimentar Agora
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Lado Direito: Mockup Visual Realista (7 colunas) */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6 shadow-inner">
              {/* Renderização do Mockup Específico */}
              {activeTab.previewType === 'pix' && <MockupPix />}
              {activeTab.previewType === 'kitchen' && <MockupKitchen />}
              {activeTab.previewType === 'orders' && <MockupOrders />}
              {activeTab.previewType === 'drops' && <MockupDrops />}
              {activeTab.previewType === 'combos' && <MockupCombos />}
              {activeTab.previewType === 'dashboard' && <MockupDashboard />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// MOCKUPS VISUAIS DAS ABAS (DESIGN SYSTEM)
// ==========================================

function MockupPix() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Zap className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Fluxo de Pagamento PIX Instantâneo</div>
            <div className="text-[10px] text-neutral-500">Sem conferência manual de comprovante</div>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          ● AO VIVO
        </span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-900">Pedido #1084 • Mariana Silveira</span>
          <span className="font-mono text-xs font-bold text-emerald-700">R$ 138,00</span>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-medium">
          <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
          <span>PIX Confirmado Automaticamente pelo Banco em 3 segundos</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 pt-1">
          <div className="p-2 rounded bg-neutral-50 border border-neutral-100">
            <span className="block text-[10px] text-neutral-400">Destino do dinheiro</span>
            <strong className="text-neutral-900">Sua conta bancária</strong>
          </div>
          <div className="p-2 rounded bg-neutral-50 border border-neutral-100">
            <span className="block text-[10px] text-neutral-400">Tempo de retenção</span>
            <strong className="text-emerald-700 font-semibold">Zero (Cai na hora!)</strong>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-white border border-neutral-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-neutral-600">
          <Banknote className="size-4 text-neutral-500" />
          <span>Taxa da transação (7%)</span>
        </div>
        <span className="font-mono text-neutral-500 font-medium">Apenas R$ 9,66</span>
      </div>
    </div>
  )
}

function MockupKitchen() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
            <ChefHat className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Produção do Dia • Sábado 15/Out</div>
            <div className="text-[10px] text-neutral-500">Resumo consolidado para a cozinha</div>
          </div>
        </div>
        <span className="text-xs font-mono font-medium text-neutral-700 bg-neutral-200/70 px-2 py-0.5 rounded">
          42 itens totais
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-neutral-900">Pão Sourdough Tradicional (Fermentação 36h)</span>
            <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">20 / 20 prontos</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="bg-neutral-900 h-full w-[100%]" />
          </div>
          <div className="flex justify-between text-[11px] text-emerald-800 font-medium">
            <span>Fornada 100% assada e embalada</span>
            <span>✅ Concluído</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-neutral-900">Bolo Cenoura com Brigadeiro Vulcão</span>
            <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">8 / 12 prontos</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="bg-neutral-900 h-full w-[66%]" />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>4 bolos ainda no forno (entrega às 16h)</span>
            <span className="text-neutral-900 font-medium">66% pronto</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-neutral-900">Caixas Degustação Brigadeiros Gourmet</span>
            <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">10 / 10 prontas</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="bg-neutral-900 h-full w-[100%]" />
          </div>
          <div className="flex justify-between text-[11px] text-emerald-800 font-medium">
            <span>Todas as caixas etiquetadas para retirada</span>
            <span>✅ Concluído</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupOrders() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
            <ShoppingBag className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Gerenciador de Pedidos Ativos</div>
            <div className="text-[10px] text-neutral-500">Fluxo visual para a rotina da cozinha</div>
          </div>
        </div>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          Auto-confirmação Ativa
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                #1092
              </span>
              <span className="text-xs font-semibold text-neutral-900">Camila Andrade</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                📅 Encomenda p/ Sábado
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-200">
                Em Preparo
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              1x Bolo de Festa 2kg + 20 Doces • 🚚 Entrega agendada para 15:30
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-900">R$ 148,00</span>
            <div className="size-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <MessageCircle className="size-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                #1091
              </span>
              <span className="text-xs font-semibold text-neutral-900">Lucas Menezes</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ⚡ Pronta-Entrega
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pronto p/ Retirada
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              2x Pão Italiano Artesanal • 🏪 Retirada imediata no balcão
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-900">R$ 56,00</span>
            <div className="size-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <MessageCircle className="size-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                #1090
              </span>
              <span className="text-xs font-semibold text-neutral-900">Fernanda Costa</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ⚡ Pronta-Entrega
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                Despachado
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              1x Caixa 16 Brigadeiros • 🚚 Entregue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-900">R$ 84,00</span>
            <div className="size-7 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs">
              <CheckCircle2 className="size-3.5 text-neutral-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupDrops() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
            <Flame className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Pré-venda Especial • Drop de Sábado</div>
            <div className="text-[10px] text-neutral-500">Sensação de evento exclusivo para os clientes</div>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
          ● AO VIVO AGORA
        </span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-neutral-200/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-600 flex items-center gap-1.5">
            <Clock className="size-3.5 text-neutral-500" />
            Encerramento dos pedidos:
          </span>
          <span className="font-mono font-bold text-neutral-900">Sexta às 18:00</span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-around text-center">
          <div>
            <div className="text-lg font-bold font-mono text-neutral-900">04</div>
            <div className="text-[9px] text-neutral-500 uppercase">Horas</div>
          </div>
          <span className="text-neutral-300 font-bold">:</span>
          <div>
            <div className="text-lg font-bold font-mono text-neutral-900">22</div>
            <div className="text-[9px] text-neutral-500 uppercase">Minutos</div>
          </div>
          <span className="text-neutral-300 font-bold">:</span>
          <div>
            <div className="text-lg font-bold font-mono text-neutral-900">45</div>
            <div className="text-[9px] text-neutral-500 uppercase">Segundos</div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-neutral-900">Fornada Limitada (30 unidades)</span>
            <span className="font-mono font-bold text-neutral-900">27 / 30 reservados</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden">
            <div className="bg-neutral-900 h-full w-[90%]" />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-rose-700 font-medium">Restam apenas 3 unidades!</span>
            <span className="text-neutral-500">90% vendido</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupCombos() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
            <Boxes className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Vitrine • Combos & Categorias</div>
            <div className="text-[10px] text-neutral-500">Produtos organizados e kits de alto ticket</div>
          </div>
        </div>
        <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
          Link da Bio
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 space-y-2">
          <div className="size-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-semibold text-xs">
            <Boxes className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Combo Café da Tarde</div>
            <p className="text-[10px] text-neutral-500">1x Pão Rústico + 1x Geléia + 1x Bolo Caseiro</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-xs font-bold text-neutral-900">R$ 58,00</span>
            <span className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
              Economize R$ 12
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-neutral-200/80 space-y-2">
          <div className="size-8 rounded-lg bg-pink-50 text-pink-800 flex items-center justify-center font-semibold text-xs">
            <Cake className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Caixa Degustação (12un)</div>
            <p className="text-[10px] text-neutral-500">Cliente escolhe até 4 sabores finos</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-xs font-bold text-neutral-900">R$ 48,00</span>
            <span className="text-[10px] text-neutral-600 font-medium bg-neutral-100 px-1.5 py-0.5 rounded">
              Mais Vendido
            </span>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-white border border-neutral-200/80 flex items-center justify-between text-xs">
        <span className="text-neutral-500">Categorias ativas:</span>
        <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-700">
          <span className="bg-neutral-100 px-2 py-0.5 rounded">🥖 Pães</span>
          <span className="bg-neutral-100 px-2 py-0.5 rounded">🎂 Bolos</span>
          <span className="bg-neutral-100 px-2 py-0.5 rounded">🍬 Docinhos</span>
        </div>
      </div>
    </div>
  )
}

function MockupDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">Panorama Geral da Loja</div>
            <div className="text-[10px] text-neutral-500">Controle financeiro e operacional consolidado</div>
          </div>
        </div>
        <span className="text-[11px] font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
          Hoje
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg bg-white border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase">Faturamento</span>
          <div className="text-base font-bold font-mono text-neutral-900">R$ 3.840</div>
          <span className="text-[10px] text-emerald-700 font-medium">100% no PIX</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase">Pedidos Pagos</span>
          <div className="text-base font-bold font-mono text-emerald-800">46</div>
          <span className="text-[10px] text-neutral-500">0 pendentes</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase">Ticket Médio</span>
          <div className="text-base font-bold font-mono text-neutral-900">R$ 83,50</div>
          <span className="text-[10px] text-neutral-500">+18% com combos</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-medium text-neutral-500 uppercase">Pré-venda</span>
          <div className="text-base font-bold font-mono text-amber-800">92%</div>
          <span className="text-[10px] text-neutral-500">quase esgotada</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-700" />
          <span>Todos os pagamentos foram recebidos diretamente na sua conta bancária.</span>
        </div>
        <span className="font-semibold text-emerald-800">R$ 0 retido</span>
      </div>
    </div>
  )
}

// ==========================================
// 3. ACORDEÃO DE PERGUNTAS FREQUENTES (FAQ)
// ==========================================

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'O dinheiro do PIX cai direto na minha conta mesmo?',
    answer:
      'Sim! O pagamento do cliente cai na mesma hora direto na sua conta bancária cadastrada. O sistema valida o pagamento automaticamente via QR Code / Copia e Cola sem que você precise conferir comprovantes manuais, e não existe retenção de 14 ou 30 dias.',
  },
  {
    question: 'Eu realmente não pago nenhuma mensalidade fixa?',
    answer:
      'Exatamente! Zero mensalidade. Você não paga absolutamente nada para se cadastrar, criar sua loja, cadastrar produtos, categorias ou abrir pré-vendas. Você só paga se vender, e a taxa é de apenas 7% sobre as vendas aprovadas. Se em algum mês você não vender nada ou tirar férias, sua conta continua ativa e você não paga 1 centavo.',
  },
  {
    question: 'O que é a funcionalidade de "Gerenciar o total de comida a ser feita no dia"?',
    answer:
      'É o nosso resumo de produção da cozinha (KDS inteligente). O sistema soma automaticamente todos os pedidos do dia e mostra exatamente o total consolidado de cada receita que você precisa produzir (ex: 20 pães sourdough, 15 bolos de cenoura, 40 brigadeiros), organizados por data e horário de entrega. Você sabe exatamente o que assar e cozinhar sem desperdício de insumos caros.',
  },
  {
    question: 'Como funciona o cardápio de pré-venda (Drop)?',
    answer:
      'Você cria um evento de pré-venda com data de início, data limite de pedidos e quantidade máxima de produção. O cardápio exibe um cronômetro regressivo e a quantidade restante em tempo real. Isso cria um forte efeito de escassez e urgência, fazendo com que os clientes garantam suas encomendas rapidamente antes que esgote.',
  },
  {
    question: 'O cliente precisa baixar algum aplicativo para fazer o pedido?',
    answer:
      'Não! O cliente acessa sua vitrine diretamente pelo navegador do celular através do link que você coloca na bio do Instagram ou envia no WhatsApp. É leve, abre em menos de 2 segundos, não exige download e nem criação de senhas complicadas.',
  },
  {
    question: 'Posso criar combos especiais e organizar produtos por categorias?',
    answer:
      'Com certeza! Você pode criar categorias como "Bolos de Festa", "Pães de Fermentação Natural", "Docinhos" e também combos especiais ("Combo Café da Tarde", "Caixa Degustação") onde o cliente escolhe os itens ou sabores desejados, ajudando a elevar seu ticket médio de venda.',
  },
  {
    question: 'Como funciona o gerenciador de pedidos e o botão de WhatsApp?',
    answer:
      'Você tem um painel visual dividido em etapas claras: Pedidos Pendentes, Em Preparo, Prontos para Retirada e Despachados. Com apenas 1 clique no ícone do WhatsApp, você abre a conversa com o cliente já com a mensagem personalizada avisando que o pedido dele está pronto ou a caminho.',
  },
  {
    question: 'Posso aceitar pedidos para encomenda ou pronta-entrega?',
    answer:
      'Com certeza! O AppDrops suporta tanto pronta-entrega (itens que você já tem frescos no balcão para despacho ou retirada imediata) quanto encomendas programadas com antecedência (bolos de festa, doces sob medida, etc.) onde o cliente escolhe no calendário a data exata e a faixa de horário para retirar ou receber.',
  },
]

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIndex((curr) => (curr === idx ? null : idx))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx
        return (
          <div
            key={idx}
            className="rounded-xl border border-neutral-200/80 bg-white overflow-hidden shadow-xs transition-all"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
            >
              <span className="font-semibold text-sm sm:text-base text-neutral-900">
                {item.question}
              </span>
              <ChevronDown
                className={`size-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-neutral-900' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

