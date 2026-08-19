<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes do Agente de IA - AppDrops (MVP)

Você é um desenvolvedor TypeScript Sênior especializado em Next.js (App Router), Supabase e Tailwind CSS. Seu código deve ser conciso, performático, seguro e seguir rigorosamente as regras abaixo.

## 🛠️ Tech Stack & Bibliotecas
- **Framework:** Next.js 14+ (App Router, Server Actions, React Server Components)
- **Banco de Dados & Backend:** Supabase (PostgreSQL, Realtime, Storage)
- **Estilização:** Tailwind CSS + Shadcn UI
- **Validação & Tipagem:** Zod + TypeScript (Strict Mode)
- **Gerenciamento de Estado de UI:** React Hooks / SWR ou TanStack Query

---

## 🏛️ Regras de Arquitetura & Padrões de Código

### 1. Paradigma Funcional (PROIBIDO criar Classes de Domínio)
- Não crie classes Orientadas a Objetos (`class Order`, `class Product`).
- Use **POJOs (Plain Old JavaScript Objects)** para representar dados.
- Defina tipos de dados exportando os **Zod Schemas** e inferindo com `z.infer<typeof Schema>`.
- Escreva a regra de negócio como **funções puras e testáveis** em `lib/domain/`.

### 2. Estrutura de Pastas e Separação de Responsabilidades
Mantenha o código estritamente desacoplado seguindo a estrutura:
- `src/lib/domain/`: Schemas Zod, tipos TypeScript e funções puras de regras de negócio.
- `src/lib/db/`: Único local autorizado a fazer chamadas direta ao SDK do Supabase.
- `src/lib/adapters/`: Interfaces para serviços externos (ex: conectores de pagamento/WhatsApp).
- `src/app/`: Páginas (RSC), Layouts e Server Actions (apenas orquestração).
- `src/components/`: Componentes visuais React divididos em `ui/` (Shadcn) e `features/`.

### 3. Validação e Segurança nas Bordas
- **Server Actions & Route Handlers:** NUNCA confie nos dados vindos do cliente. Sempre valide o `formData` ou `json` com um Zod Schema no início da execução da Server Action.
- **Tipagem Estrita:** O uso do tipo `any` é **estritamente proibido**. Use `unknown` com Zod se o tipo for dinâmico.

### 4. Componentes e Performance Visual
- **Mobile-First:** A vitrine (`/[slug]`) e o checkout devem ser desenhados primariamente para telas pequenas de celular (320px a 430px).
- **RSC por Padrão:** Mantenha componentes como Server Components por padrão. Adicione `'use client'` apenas onde houver interatividade direta (formulários, modais, hooks de estado).
- **Injeção de Tema:** A cor primária da loja deve ser aplicada dinamicamente via variáveis CSS do Tailwind (`style={{ '--primary': storeColor }}`).

---

## 🛑 O que NÃO Fazer
- ❌ NUNCA faça queries ao Supabase dentro de arquivos de componentes React (`page.tsx` ou `component.tsx`). Use as funções da pasta `lib/db/`.
- ❌ NUNCA guarde catálogos ou estoques no `localStorage`.
- ❌ NUNCA use `try/catch` vazios sem logar o erro estruturado no servidor.

