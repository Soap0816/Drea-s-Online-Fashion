import type { Settings, LocationTier, ShipmentSize } from "./types";

export interface DeliveryQuote {
  deliveryFeeCents: number;
  codSurchargeCents: number;
  totalWithDeliveryCents: number;
}

/**
 * Computes the oDeliver delivery fee for a Local Delivery order, plus the
 * Standard-account cash-on-delivery service charge (Corporate accounts
 * don't pay it — see Settings > Delivery for the account type and rate
 * card, both editable without touching code).
 */
export function quoteDelivery(
  settings: Settings,
  params: {
    deliveryMethod: "local_delivery" | "pickup";
    locationTier?: LocationTier;
    shipmentSize?: ShipmentSize;
    paymentMethod: string;
    subtotalCents: number;
  }
): DeliveryQuote {
  if (params.deliveryMethod === "pickup") {
    return {
      deliveryFeeCents: settings.delivery_fee_pickup,
      codSurchargeCents: 0,
      totalWithDeliveryCents: params.subtotalCents + settings.delivery_fee_pickup,
    };
  }

  const tier = params.locationTier ?? "urban";
  const size = params.shipmentSize ?? "small";
  const accountRates = settings.delivery_rates[settings.courier_account_type];
  const deliveryFeeCents =
    accountRates?.[tier]?.[size] ?? settings.delivery_fee_default ?? 0;

  const isCashOnDelivery = params.paymentMethod === "cash";
  const surchargeApplies = isCashOnDelivery && settings.courier_account_type === "standard";
  const preSurchargeTotal = params.subtotalCents + deliveryFeeCents;
  const codSurchargeCents = surchargeApplies
    ? Math.round((preSurchargeTotal * settings.cod_surcharge_percent) / 100)
    : 0;

  return {
    deliveryFeeCents,
    codSurchargeCents,
    totalWithDeliveryCents: preSurchargeTotal + codSurchargeCents,
  };
}
