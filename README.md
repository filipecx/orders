🛍️ AppDrops — Vitrine de Pedidos & Drops
Plataforma full-stack de alta performance para criação e gestão de vitrines digitais, lançamentos exclusivos (Drops) e encomendas. Desenvolvida com arquitetura mobile-first, foco em velocidade de carregamento, checkout integrado com Pix e consultas inteligentes via Inteligência Artificial.

🧠 Inteligência Artificial (Text2SQL)
A plataforma conta com um módulo inteligente de Text2SQL:
Permite que lojistas e administradores realizem perguntas em linguagem natural (ex: "Quais foram os 5 produtos mais vendidos deste mês no Pix?" ou "Qual o faturamento do último drop?").
A IA interpreta o contexto do negócio, converte a pergunta em queries SQL seguras, executa no banco de dados e retorna respostas e relatórios analíticos prontos em segundos.

🛠️ Tecnologias Utilizadas
Core & Framework
Next.js (App Router / React 19): Renderização no servidor (RSC), Server Actions para mutações e arquitetura funcional com tipagem estrita (Zod + TypeScript).
Tailwind CSS + Shadcn UI: Interface moderna, responsiva e otimizada para dispositivos móveis (320px a 430px).
Dados, Cache & Storage
Supabase (PostgreSQL): Banco de dados relacional, autenticação segura e Storage de imagens com otimização WebP e CDN.
Redis (Docker): Camada de cache distribuído em memória com padrão Cache-Aside, invalidação reativa via Server Actions no Admin e resiliência Fail-Open com commandTimeout.
DevOps, Nuvem & CI/CD
Docker Multi-Stage: Imagem standalone ultraleve (~80 MB) rodando com usuário restrito não-root.
AWS ECR: Registro privado de containers com política de ciclo de vida (Free Tier).
AWS EC2: Servidor de produção com proteção de 2 GB de SWAP e permissões nativas via IAM Role.
GitHub Actions: Esteira de CI/CD automatizada que roda testes com container temporário de Redis (Vitest) e realiza o deploy contínuo na AWS.
      
