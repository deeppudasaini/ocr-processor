import { VedasApiResponse } from '@modules/ocr/types/ocr.types';

export interface NormalizedVedasResponse {
  merchantName:    string | null;
  merchantAddress: string | null;
  billDate:        string | null;
  billTime:        string | null;
  currency:        string | null;
  subtotalAmount:  string | null;
  taxAmount:       string | null;
  serviceCharge:   string | null;
  tipAmount:       string | null;
  discountAmount:  string | null;
  totalAmount:     string | null;
  items: Array<{
    name:        string | null;
    qty:         string | null;
    unit_price:  string | null;
    total_price: string | null;
  }>;
}

function toStringOrNull(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val);
}

export function normalizeVedasResponse(raw: VedasApiResponse): NormalizedVedasResponse {
  const r = raw as unknown as Record<string, unknown>;
  const data: Record<string, unknown> =
    r['data'] && typeof r['data'] === 'object'
      ? (r['data'] as Record<string, unknown>)
      : r;

  const rawItems = Array.isArray(data['items']) ? data['items'] : [];

  return {
    merchantName:    toStringOrNull(data['merchant_name']   ?? data['merchantName']),
    merchantAddress: toStringOrNull(data['address']         ?? data['merchant_address']),
    billDate:        toStringOrNull(data['date']            ?? data['bill_date']),
    billTime:        toStringOrNull(data['time']            ?? data['bill_time']),
    currency:        toStringOrNull(data['currency']),
    subtotalAmount:  toStringOrNull(data['subtotal_amount'] ?? data['subtotal']),
    taxAmount:       toStringOrNull(data['tax_amount']      ?? data['tax']),
    serviceCharge:   toStringOrNull(data['service_charge']),
    tipAmount:       toStringOrNull(data['tip_amount']      ?? data['tip']),
    discountAmount:  toStringOrNull(data['discount_amount'] ?? data['discount']),
    totalAmount:     toStringOrNull(data['total_amount']    ?? data['total']),
    items: rawItems.map((item: unknown) => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        name:        toStringOrNull(i['name']        ?? i['item_name']),
        qty:         toStringOrNull(i['qty']         ?? i['quantity']),
        unit_price:  toStringOrNull(i['unit_price']  ?? i['price']),
        total_price: toStringOrNull(i['total_price'] ?? i['total']),
      };
    }),
  };
}
