# 🎨 Diretrizes de Design & UI/UX - SaaS Minimalista & Elegante

Este documento define o guia de estilo visual da aplicação. Todas as telas e componentes gerados por Agentes de IA devem seguir rigorosamente esta estética minimalista, limpa e elegante.

---

## 1. Princípios de Design & Estética

- **Sem Gradientes:** Use apenas cores sólidas e suaves. O visual deve transmitir sofisticação, clareza e leveza.
- **Uso Módico de Emojis:** Mantenha os emojis funcionais (ex: 🚀, 📅, 🚚, 🏪, 👨‍🍳) para dar vida e leitura rápida aos status e botões, sem poluir a tela.
- **Mobile-First para Cozinha:** O painel `/admin` precisa de alvos de toque generosos (mínimo `44px`), mas com espaçamentos elegantes e tipografia nítida.
- **Hierarquia por Contraste:** Em vez de usar bordas grossas ou fundos coloridos fortes, use variações sutis de cinza/neutral e pesos de fonte para destacar informações.

---

## 2. Paleta de Cores (Tailwind CSS - Zinc / Neutral)

### Neutros & Backgrounds (Predominantes)

- **Fundo da Aplicação:** `bg-neutral-50` (fundo levemente off-white, descanso visual).
- **Cards & Superfícies:** `bg-white` com borda ultra suave (`border-neutral-200/80`).
- **Sombra Elegante:** `shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]` (sombra quase imperceptível, apenas para criar profundidade).

### Cores de Destaque / Ação

- **Ação Primária / Botões:** `bg-neutral-900` com texto `text-white` (Preto/Grafite profundo - passa elegância e sofisticação). Hover em `bg-neutral-800`.
- **Texto Principal:** `text-neutral-900` (`font-semibold` ou `font-bold`).
- **Texto Secundário:** `text-neutral-500`.

### Status de Pedidos (Cores Suaves e Sólidas - Sem Gradientes)

- **Pendente / A Fazer:**
  - Fundo: `bg-amber-50` | Texto: `text-amber-800` | Borda: `border-amber-200`
- **Em Preparo / Produção:**
  - Fundo: `bg-sky-50` | Texto: `text-sky-800` | Borda: `border-sky-200`
- **Pronto / Concluído:**
  - Fundo: `bg-emerald-50` | Texto: `text-emerald-800` | Borda: `border-emerald-200`
- **Cancelado:**
  - Fundo: `bg-rose-50` | Texto: `text-rose-800` | Borda: `border-rose-200`

---

## 3. Tipografia & Espaçamento

- **Fonte Recomendada:** `Plus Jakarta Sans`, `Inter` ou `Geist`.
- **Títulos (H1 / H2):** `tracking-tight font-semibold text-neutral-900`.
- **Destaques / Números (Contadores):** Usar `font-mono` ou `tabular-nums` para contadores numéricos (ex: `0/3`) para evitar que a tela balance ao mudar números.

---

## 4. Componentes Padrão

### Cards de Conteúdo & Pedidos

- **Estilo Base:** `bg-white border border-neutral-200/80 rounded-xl p-5 shadow-sm transition-all`.
- **Cards Concluídos / Sanfona Fechada:** `bg-neutral-50/60 border-neutral-200 text-neutral-500 opacity-90`.

### Botões (Buttons)

- **Primário (Concluir / Salvar):** `bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors`.
- **Secundário / Neutro:** `bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium rounded-lg px-3 py-1.5 text-sm`.
- **Atalho WhatsApp:** `bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg px-3 py-1.5 text-sm`.

### Badges e Tags

- **Estilo Minimalista:** `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border`.
- **Exemplos:**
  - Encomendas: `bg-neutral-100 border-neutral-200 text-neutral-700`
  - Entrega: `bg-neutral-100 border-neutral-200 text-neutral-700`
