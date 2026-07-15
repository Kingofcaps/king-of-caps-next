import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import { deleteOrder, getOrder, updateOrderUnlessCancelled, type OrderStatus } from "@/app/lib/orders";
import { restoreProductStock } from "@/app/lib/products";
import { recordStockMovementSafely } from "@/app/lib/stock-movements";

export const runtime = "nodejs";

const validStatuses: OrderStatus[] = ["new", "confirmed", "preparing", "delivered", "cancelled"];

export async function PATCH(request: Request, context: RouteContext<"/api/admin/orders/[id]">) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orderStatus } = (await request.json()) as { orderStatus?: unknown };
  if (!validStatuses.includes(orderStatus as OrderStatus)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const requestedStatus = orderStatus as OrderStatus;
    const currentOrder = await getOrder(id);
    if (!currentOrder) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    if (currentOrder.order_status === "cancelled") {
      if (requestedStatus === "cancelled") return NextResponse.json(currentOrder);
      return NextResponse.json({ error: "Une commande annulée ne peut pas être réactivée." }, { status: 409 });
    }

    const updatedOrder = await updateOrderUnlessCancelled(id, requestedStatus);
    if (!updatedOrder) {
      const latestOrder = await getOrder(id);
      if (latestOrder?.order_status === "cancelled") return NextResponse.json(latestOrder);
      return NextResponse.json({ error: "La commande a été modifiée entre-temps. Réessayez." }, { status: 409 });
    }

    if (requestedStatus === "cancelled") {
      const restoredProduct = await restoreProductStock(updatedOrder.product_id, updatedOrder.quantity);
      await recordStockMovementSafely({
        productId: restoredProduct.id,
        productName: restoredProduct.name,
        movementType: "order_cancellation",
        quantityChange: updatedOrder.quantity,
        previousQuantity: restoredProduct.stockQuantity - updatedOrder.quantity,
        newQuantity: restoredProduct.stockQuantity,
        note: `Annulation de la commande ${updatedOrder.order_number}`,
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de modifier la commande." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/orders/[id]">) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deletedOrder = await deleteOrder(id);
    if (!deletedOrder) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    return NextResponse.json({ success: true, id: deletedOrder.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de supprimer la commande." },
      { status: 500 },
    );
  }
}
