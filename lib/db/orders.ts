import { createClient } from "@/lib/supabase/server";
import { getStoreByOwner } from "@/lib/db/stores";
import type { Json } from "@/types/database.types";
import type {
  CheckoutFormInput,
  Order,
  OrderStatus,
  OrderWithItems,
  PaymentStatus,
  ProductionStatus,
} from "@/lib/domain/orders";
import { type Store, isStoreAutoConfirmOrders, isStoreOpen } from "@/lib/domain/stores";
import { getProductPriceForModality } from "@/lib/domain/products";

/**
 * Cria um novo pedido no banco de dados, insere os itens e abate o estoque do Drop.
 * Suporta agendamento de data/horário, método de entrega e status de produção.
 */
export async function createOrder(input: CheckoutFormInput): Promise<Order> {
  const supabase = await createClient();

  // 0. Idempotência preventiva: se idempotency_key for fornecida, retorna o pedido existente
  if (input.idempotency_key) {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", input.store_id)
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();

    if (existingOrder) {
      return existingOrder;
    }
  }

  // 1. Obter dados e configurações da loja
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("id", input.store_id)
    .single();

  if (storeError || !store) {
    console.error("[lib/db/orders.ts] Loja não encontrada:", storeError);
    throw new Error("Loja não encontrada para processar o pedido.");
  }

  // Validação de segurança: Impede novos pedidos de pronta-entrega se a loja foi pausada
  const modality = input.scheduled_date ? "order" : "ready_delivery";
  if (modality === "ready_delivery") {
    const storeStatus = isStoreOpen(store);
    if (!storeStatus.isOpen) {
      throw new Error(`A loja pausou os pedidos neste momento. Tente novamente mais tarde.`);
    }
  }

  // Verifica se a confirmação automática está habilitada na loja
  const autoConfirm = isStoreAutoConfirmOrders(store);
  const initialStatus: OrderStatus = autoConfirm ? "preparing" : "pending";
  const initialProductionStatus: ProductionStatus = autoConfirm
    ? "preparing"
    : (input.production_status ?? "pending");

  // 2. Recalcular e validar preços oficiais no servidor (Anti-Tampering & Multi-tenant)
  const validatedItems: Array<{
    product_id: string | null;
    drop_item_id: string | null;
    product_name: string;
    product_image_url: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    notes: string | null;
    customizations: Record<string, unknown>;
  }> = [];

  for (const item of input.items) {
    let resolvedPrice = 0;
    let resolvedName = item.product_name;
    let resolvedImage = item.product_image_url ?? null;

    if (item.drop_item_id) {
      const { data: dropItem, error: dropItemError } = await supabase
        .from("drop_items")
        .select(`
          id,
          custom_price,
          promotional_price,
          is_active,
          drop:drops!inner(id, store_id, is_active),
          product:products(id, name, price, promotional_price, image_url)
        `)
        .eq("id", item.drop_item_id)
        .single();

      const dropStore = (dropItem?.drop as unknown as { store_id?: string; is_active?: boolean })?.store_id;
      if (dropItemError || !dropItem || dropStore !== input.store_id || !dropItem.is_active) {
        throw new Error(`Item de pré-venda indisponível ou inválido.`);
      }

      const prod = dropItem.product as unknown as {
        name?: string;
        price?: number;
        promotional_price?: number | null;
        image_url?: string | null;
      } | null;

      resolvedPrice =
        dropItem.promotional_price ??
        dropItem.custom_price ??
        prod?.promotional_price ??
        prod?.price ??
        0;
      resolvedName = prod?.name ?? item.product_name;
      resolvedImage = prod?.image_url ?? resolvedImage;
    } else if (item.combo_id) {
      const { data: combo, error: comboError } = await supabase
        .from("combos")
        .select("id, store_id, name, price, active, image_url")
        .eq("id", item.combo_id)
        .single();

      if (comboError || !combo || combo.store_id !== input.store_id || !combo.active) {
        throw new Error(`Combo indisponível ou inválido nesta loja.`);
      }

      resolvedPrice = combo.price;
      resolvedName = combo.name;
      resolvedImage = combo.image_url ?? resolvedImage;
    } else if (item.product_id) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.product_id)
        .single();

      if (productError || !product || product.store_id !== input.store_id || !product.is_active) {
        throw new Error(`Produto indisponível ou inválido nesta loja.`);
      }

      resolvedPrice = getProductPriceForModality(product, modality);
      resolvedName = product.name;
      resolvedImage = product.image_url ?? resolvedImage;
    } else {
      throw new Error(`Item do carrinho inválido (sem referência a produto).`);
    }

    const qty = Math.max(1, item.quantity);

    // FIX: Limitar propriedades do payload de customizações para evitar DoS
    const safeCustomizations = (item.customizations && Object.keys(item.customizations).length < 20) 
      ? item.customizations 
      : {};
      
    // TODO: Adicionar lógica para buscar o preço real das customizações no banco.
    // Atualmente confia-se apenas no preço base. Se houver adicionais pagos, isso deve ser calculado aqui.
    const customExtraPrice = 0; 
    const finalUnitPrice = resolvedPrice + customExtraPrice;

    validatedItems.push({
      product_id: item.product_id ?? null,
      drop_item_id: item.drop_item_id ?? null,
      product_name: resolvedName,
      product_image_url: resolvedImage,
      unit_price: finalUnitPrice,
      quantity: qty,
      total_price: finalUnitPrice * qty,
      notes: item.notes?.substring(0, 500) ?? null,
      customizations: safeCustomizations as Record<string, unknown>,
    });
  }

  const subtotal = validatedItems.reduce((acc, item) => acc + item.total_price, 0);
  const deliveryFee = 0;
  const total = subtotal;

  // 3. Obter próximo order_number atômico via RPC (fallback para MAX + 1)
  let nextOrderNumber = 1001;
  const { data: rpcOrderNum, error: rpcOrderError } = await supabase.rpc(
    "next_order_number",
    { p_store_id: input.store_id }
  );

    if (!rpcOrderError && rpcOrderNum) {
      nextOrderNumber = rpcOrderNum;
    } else {
      // Fallback caso a migration ainda não tenha rodado
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("order_number")
        .eq("store_id", input.store_id)
        .order("order_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      nextOrderNumber = Math.max(1000, lastOrder?.order_number ?? 1000) + 1;
    }

  // Normalização do método de entrega
  const deliveryMethod =
    input.delivery_method ??
    (input.delivery_type === "pickup" ? "pickup" : "delivery");

  // 4. Inserir o Pedido com novos campos de produção e agendamento
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: input.store_id,
      drop_id: input.drop_id ?? null,
      order_number: nextOrderNumber,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email:
        input.customer_email && input.customer_email.length > 0
          ? input.customer_email
          : null,
      delivery_type: input.delivery_type,
      delivery_method: deliveryMethod,
      delivery_address: input.delivery_address ?? null,
      scheduled_date: input.scheduled_date ?? null,
      scheduled_time_slot: input.scheduled_time_slot ?? null,
      production_status: initialProductionStatus,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      payment_method: input.payment_method,
      payment_status: "pending",
      status: initialStatus,
      idempotency_key: input.idempotency_key ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (orderError || !order) {
    // Se colidir em concorrência simultânea (Unique Violation no Postgres)
    if (orderError?.code === "23505" && input.idempotency_key) {
      const { data: raceOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", input.store_id)
        .eq("idempotency_key", input.idempotency_key)
        .maybeSingle();

      if (raceOrder) {
        return raceOrder;
      }
    }

    console.error("[lib/db/orders.ts] Erro ao criar pedido:", orderError);
    throw new Error(`Erro ao finalizar pedido: ${orderError?.message}`);
  }

  // 5. Inserir os Itens do Pedido com preços calculados no servidor
  const orderItemsPayload = validatedItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    drop_item_id: item.drop_item_id,
    product_name: item.product_name,
    product_image_url: item.product_image_url,
    unit_price: item.unit_price,
    quantity: item.quantity,
    total_price: item.total_price,
    notes: item.notes,
    customizations: (item.customizations as Json) ?? {},
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload);

  if (itemsError) {
    console.error(
      "[lib/db/orders.ts] Erro ao inserir itens do pedido:",
      itemsError,
    );
  }

  // 6. Abater estoque dos itens do Drop
  for (const item of input.items) {
    if (item.drop_item_id) {
      try {
        const { error: rpcError } = await supabase.rpc(
          "deduct_drop_item_stock",
          {
            p_drop_item_id: item.drop_item_id,
            p_quantity: item.quantity,
          },
        );

        if (rpcError) {
          console.error(
            "[lib/db/orders.ts] Erro crítico ao abater estoque do drop via RPC:",
            rpcError.message,
          );
          // FIX: Removido fallback inseguro que causava overselling. 
          // Se a RPC falhar, a transação deve falhar para proteger o negócio contra Overselling.
          throw new Error("Estoque indisponível no momento ou erro de concorrência. Tente finalizar novamente.");
        }
      } catch (err) {
        console.error(
          "[lib/db/orders.ts] Erro ao abater estoque do drop:",
          err,
        );
        throw err;
      }
    }
  }

  return order;
}

/**
 * Busca todos os pedidos de uma loja (ou da loja do lojista logado).
 * Suporta filtro por status comercial e por status de produção.
 */
export async function getOrdersByStoreId(
  explicitStoreId?: string,
  statusFilter?: OrderStatus | "all",
  productionStatusFilter?: ProductionStatus | "all",
): Promise<OrderWithItems[]> {
  const supabase = await createClient();

  let storeId = explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) return [];
    storeId = store.id;
  }

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(300); // FIX: Limite máximo para evitar estouro de memória em lojas com muito histórico

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (productionStatusFilter && productionStatusFilter !== "all") {
    query = query.eq("production_status", productionStatusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[lib/db/orders.ts] Erro ao listar pedidos da loja:", error);
    throw new Error(`Erro ao listar pedidos: ${error.message}`);
  }

  return (data ?? []).map((order) => ({
    ...order,
    items: order.items ?? [],
    store: order.store as unknown as Store,
  }));
}

/**
 * Lista apenas os pedidos ativos (não entregues e não cancelados) da loja.
 * Otimiza o carregamento inicial da página de pedidos/kanban.
 */
export async function getActiveOrdersByStoreId(
  explicitStoreId?: string
): Promise<OrderWithItems[]> {
  const supabase = await createClient();

  let storeId = explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) return [];
    storeId = store.id;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `
    )
    .eq("store_id", storeId)
    .not("status", "in", '("delivered","cancelled")')
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[lib/db/orders.ts] Erro ao listar pedidos ativos:", error);
    throw new Error(`Erro ao listar pedidos ativos: ${error.message}`);
  }

  return (data ?? []).map((order) => ({
    ...order,
    items: order.items ?? [],
    store: order.store as unknown as Store,
  }));
}

export interface PaginatedOrdersResult {
  orders: OrderWithItems[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Busca histórico paginado de pedidos finalizados ('delivered') e cancelados ('cancelled') com suporte a busca.
 */
export async function getHistoryOrdersByStoreId(options?: {
  explicitStoreId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: 'all' | 'delivered' | 'cancelled';
}): Promise<PaginatedOrdersResult> {
  const supabase = await createClient();

  let storeId = options?.explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) {
      return { orders: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
    storeId = store.id;
  }

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(50, options?.pageSize || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `,
      { count: "exact" }
    )
    .eq("store_id", storeId);

  if (options?.statusFilter === "delivered") {
    query = query.eq("status", "delivered");
  } else if (options?.statusFilter === "cancelled") {
    query = query.eq("status", "cancelled");
  } else {
    query = query.in("status", ["delivered", "cancelled"]);
  }

  if (options?.search && options.search.trim()) {
    const sanitize = (s: string) => s.replace(/[,().*\\]/g, "");
    const safeTerm = sanitize(options.search.trim());
    
    if (safeTerm.length > 0) {
      const isNum = /^\d+$/.test(safeTerm);
      if (isNum) {
        query = query.or(
          `order_number.eq.${safeTerm},customer_name.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%`,
        );
      } else {
        query = query.or(
          `customer_name.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%`,
        );
      }
    }
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[lib/db/orders.ts] Erro ao buscar histórico de pedidos:", error);
    throw new Error(`Erro ao buscar histórico de pedidos: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    orders: (data ?? []).map((order) => ({
      ...order,
      items: order.items ?? [],
      store: order.store as unknown as Store,
    })),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Retorna contagem rápida do histórico de pedidos da loja.
 */
export async function getHistoryOrdersCount(explicitStoreId?: string): Promise<{
  total: number;
  delivered: number;
  cancelled: number;
}> {
  const supabase = await createClient();

  let storeId = explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) return { total: 0, delivered: 0, cancelled: 0 };
    storeId = store.id;
  }

  const [deliveredRes, cancelledRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "cancelled"),
  ]);

  const delivered = deliveredRes.count || 0;
  const cancelled = cancelledRes.count || 0;

  return {
    total: delivered + cancelled,
    delivered,
    cancelled,
  };
}

/**
 * Lista pedidos organizados por agendamento de produção para o lojista.
 */
export async function listOrdersByProductionSchedule(options?: {
  explicitStoreId?: string;
  scheduledDate?: string;
  productionStatus?: ProductionStatus;
}): Promise<OrderWithItems[]> {
  const supabase = await createClient();

  let storeId = options?.explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) return [];
    storeId = store.id;
  }

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `,
    )
    .eq("store_id", storeId)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300); // FIX: Limite máximo para evitar estouro de memória

  if (options?.scheduledDate) {
    query = query.eq("scheduled_date", options.scheduledDate);
  }

  if (options?.productionStatus) {
    query = query.eq("production_status", options.productionStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "[lib/db/orders.ts] Erro ao listar pedidos por agendamento de produção:",
      error,
    );
    throw new Error(
      `Erro ao listar agendamento de produção: ${error.message}`,
    );
  }

  return (data ?? []).map((order) => ({
    ...order,
    items: order.items ?? [],
    store: order.store as unknown as Store,
  }));
}

/**
 * Busca os dados completos de um pedido pelo ID (para tela de confirmação ou detalhes).
 */
export async function getOrderById(
  orderId: string,
): Promise<OrderWithItems | null> {
  const supabase = await createClient();

  let resolvedOrder: OrderWithItems | null = null;
  // 1. Tenta buscar via RPC seguro (para visitantes na tela de confirmação /[slug]/order/[id])
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_order_by_id_public",
      { p_order_id: orderId }
    );

    if (!rpcError && rpcData) {
      const parsed = rpcData as unknown as OrderWithItems;
      resolvedOrder = {
        ...parsed,
        items: parsed.items ?? [],
        store: (parsed.store as unknown as Store) ?? null,
      };
    }
  } catch {
    // Fallback silencioso para consulta direta
  }

  // 2. Consulta padrão (para lojistas autenticados com RLS ativo)
  if (!resolvedOrder) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(*),
        store:stores(*)
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      if (orderError) {
        console.error("[lib/db/orders.ts] Erro ao buscar pedido:", orderError);
      }
      return null;
    } else {
      resolvedOrder = {
        ...order,
        items: order.items ?? [],
        store: order.store as unknown as Store,
      };
    }
  }



  return resolvedOrder;
}

/**
 * Atualiza o status de um pedido e opcionalmente o status de pagamento.
 * Garante isolamento multi-tenant verificando store_id.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentStatus?: PaymentStatus,
  productionStatus?: ProductionStatus,
  explicitStoreId?: string,
): Promise<OrderWithItems> {
  const supabase = await createClient();

  let storeId = explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) {
      throw new Error("Usuário não autenticado ou loja não encontrada.");
    }
    storeId = store.id;
  }

  const updatePayload: {
    status: OrderStatus;
    payment_status?: PaymentStatus;
    production_status?: ProductionStatus;
  } = { status };

  if (paymentStatus) {
    updatePayload.payment_status = paymentStatus;
  } else if (status === "confirmed" || status === "delivered") {
    updatePayload.payment_status = "paid";
  }

  if (productionStatus) {
    updatePayload.production_status = productionStatus;
  } else if (status === "delivered") {
    updatePayload.production_status = "delivered";
  } else if (status === "preparing") {
    updatePayload.production_status = "preparing";
  } else if (status === "ready_for_pickup") {
    updatePayload.production_status = "ready";
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("store_id", storeId)
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `,
    )
    .single();

  if (updateError || !updatedOrder) {
    console.error(
      "[lib/db/orders.ts] Erro ao atualizar status do pedido:",
      updateError,
    );
    throw new Error(
      `Erro ao atualizar status do pedido: ${updateError?.message ?? "Pedido não encontrado ou sem permissão"}`,
    );
  }

  return {
    ...updatedOrder,
    items: updatedOrder.items ?? [],
    store: updatedOrder.store as unknown as Store,
  };
}

/**
 * Atualiza o status de produção de um pedido ('pending', 'preparing', 'ready', 'delivered').
 * Garante isolamento multi-tenant verificando store_id.
 */
export async function updateProductionStatus(
  orderId: string,
  productionStatus: ProductionStatus,
  explicitStoreId?: string,
): Promise<OrderWithItems> {
  const supabase = await createClient();

  let storeId = explicitStoreId;
  if (!storeId) {
    const store = await getStoreByOwner();
    if (!store) {
      throw new Error("Usuário não autenticado ou loja não encontrada.");
    }
    storeId = store.id;
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ production_status: productionStatus })
    .eq("id", orderId)
    .eq("store_id", storeId)
    .select(
      `
      *,
      items:order_items(*),
      store:stores(*)
    `,
    )
    .single();

  if (updateError || !updatedOrder) {
    console.error(
      "[lib/db/orders.ts] Erro ao atualizar status de produção do pedido:",
      updateError,
    );
    throw new Error(
      `Erro ao atualizar status de produção: ${updateError?.message ?? "Pedido não encontrado ou sem permissão"}`,
    );
  }

  return {
    ...updatedOrder,
    items: updatedOrder.items ?? [],
    store: updatedOrder.store as unknown as Store,
  };
}

/**
 * Cancela todos os pedidos pendentes de pronta-entrega (sem data agendada)
 * de uma loja. Chamado quando o lojista pausa a loja ou encerra o atendimento.
 */
export async function cancelPendingReadyDeliveryOrders(storeId: string): Promise<number> {
  const supabase = await createClient();

  // Busca os pedidos pendentes de pronta-entrega que ainda não foram pagos
  const { data: pendingOrders, error: fetchError } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .is("scheduled_date", null)
    .in("status", ["pending", "preparing"])
    .eq("payment_status", "pending");

  if (fetchError || !pendingOrders || pendingOrders.length === 0) {
    return 0;
  }

  const orderIds = pendingOrders.map((o) => o.id);

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "failed",
    })
    .in("id", orderIds);

  if (updateError) {
    console.error(
      "[lib/db/orders.ts] Erro ao cancelar pedidos pendentes de pronta-entrega:",
      updateError
    );
    throw updateError;
  }

  return orderIds.length;
}

export async function lazyCancelOrderIfStoreClosed(
  resolvedOrder: OrderWithItems & { store?: Store },
): Promise<OrderWithItems & { store?: Store }> {
  if (
    resolvedOrder &&
    resolvedOrder.scheduled_date === null &&
    resolvedOrder.payment_status === "pending" &&
    resolvedOrder.status !== "cancelled" &&
    resolvedOrder.store
  ) {
    const storeStatus = isStoreOpen(resolvedOrder.store);
    if (!storeStatus.isOpen) {
      try {
        const supabase = await createClient();
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            payment_status: "failed",
          })
          .eq("id", resolvedOrder.id);
      } catch (err) {
        console.warn("[lib/db/orders.ts] Falha ao persistir cancelamento por fechamento da loja:", err);
      }

      resolvedOrder.status = "cancelled";
      resolvedOrder.payment_status = "failed";
    }
  }
  return resolvedOrder;
}

