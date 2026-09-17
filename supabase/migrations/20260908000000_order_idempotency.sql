-- ==============================================================================
-- Migration: 20260908000000_order_idempotency.sql
-- Descrição: Adiciona coluna idempotency_key na tabela orders e índice único
--            para prevenir criação duplicada de pedidos em retentativas ou cliques duplos.
-- ==============================================================================

-- 1. Adicionar a coluna idempotency_key na tabela orders se não existir
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- 2. Criar índice único condicional por loja e chave de idempotência
-- Apenas chaves não nulas são verificadas, permitindo compatibilidade retroativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_store_idempotency 
ON orders (store_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
