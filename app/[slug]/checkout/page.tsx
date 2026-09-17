import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/db/stores";
import { CheckoutClient } from "./checkout-client";
import { getStoreWithActiveDrop } from "@/lib/db/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return {
      title: "Checkout | Loja não encontrada",
    };
  }

  return {
    title: `Finalizar Pedido | ${store.name}`,
    description: `Checkout seguro e pagamento via PIX para ${store.name}.`,
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    notFound();
  }
  const drop = await getStoreWithActiveDrop(slug);

  return <CheckoutClient store={store} drop={drop?.activeDrop?.id} />;
}
