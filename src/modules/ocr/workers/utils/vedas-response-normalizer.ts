import { VedasApiResponse } from '@modules/ocr/types/ocr.types';
import { NormalizedVedasResponse } from '@modules/ocr/workers/interfaces/normalized-vedas-response.interface';
import { BillTypeEnum } from '@modules/ocr/constants/bill-type.enum';




// Nepali unicode digits → ASCII digits
function devanagariToAscii(val: string): string {
  return val.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
}

function toStringOrNull(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim();
  if (str === '') return null;
  return str;
}

// Converts Nepali/Devanagari numeric string to ASCII numeric string
// Returns null if not parseable as a number
function toNumericStringOrNull(val: unknown): string | null {
  const str = toStringOrNull(val);
  if (!str) return null;
  const ascii = devanagariToAscii(str).replace(/[^\d.\-]/g, '');
  return ascii === '' ? null : ascii;
}

// Handles both ASCII and Devanagari date strings → ISO format YYYY-MM-DD
// Returns null if unparseable — DB will store null rather than throw
function toIsoParsableDateOrNull(val: unknown): string | null {
  const str = toStringOrNull(val);
  if (!str) return null;
  const ascii = devanagariToAscii(str).replace(/[^\d\/\-\.]/g, '');
  // Basic format check: expects YYYY/MM/DD or YYYY-MM-DD
  const parts = ascii.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  // Return as string — TypeORM will handle casting to date column
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toTimeOrNull(val: unknown): string | null {
  const str = toStringOrNull(val);
  if (!str) return null;
  const ascii = devanagariToAscii(str).replace(/[^\d:]/g, '');
  return ascii === '' ? null : ascii;
}
function containsDevanagari(val: unknown): boolean {
  if (!val) return false;
  return /[\u0900-\u097F]/.test(String(val));
}

// Check multiple fields to determine the dominant script
function detectBillFormat(data: Record<string, unknown>): BillTypeEnum {
  const fieldsToCheck = [
    data['merchant_name'],
    data['address'],
    data['date'],
    data['currency'],
  ];

  const hasDevanagari = fieldsToCheck.some(containsDevanagari);
  return hasDevanagari ? BillTypeEnum.DEVNAGARI : BillTypeEnum.ENGLISH;
}

export function normalizeVedasResponse(raw: VedasApiResponse): NormalizedVedasResponse {
  const r = raw as unknown as Record<string, unknown>;
  const data: Record<string, unknown> =
    r['data'] && typeof r['data'] === 'object'
      ? (r['data'] as Record<string, unknown>)
      : r;

  const rawItems = Array.isArray(data['items']) ? data['items'] : [];

  let billFormat = detectBillFormat(data);

  return {
    merchantName:    toStringOrNull(data['merchant_name']   ?? data['merchantName']),
    merchantAddress: toStringOrNull(data['address']         ?? data['merchant_address']),
    billDate:         billFormat === 'ENGLISH'? toIsoParsableDateOrNull(data['date'] ?? data['bill_date']) : null,
    billTime:        toTimeOrNull(data['time']              ?? data['bill_time']),
    currency:        toStringOrNull(data['currency']),
    subtotalAmount:  toNumericStringOrNull(data['subtotal_amount'] ?? data['subtotal']),
    taxAmount:       toNumericStringOrNull(data['tax_amount']      ?? data['tax']),
    serviceCharge:   toNumericStringOrNull(data['service_charge']),
    tipAmount:       toNumericStringOrNull(data['tip_amount']      ?? data['tip']),
    discountAmount:  toNumericStringOrNull(data['discount_amount'] ?? data['discount']),
    totalAmount:     toNumericStringOrNull(data['total_amount']    ?? data['total']),
    items: rawItems.map((item: unknown) => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        name:        toStringOrNull(i['name']        ?? i['item_name']),
        qty:         toNumericStringOrNull(i['qty']  ?? i['quantity']),
        unit_price:  toNumericStringOrNull(i['unit_price']  ?? i['price']),
        total_price: toNumericStringOrNull(i['total_price'] ?? i['total']),
      };
    }),
    billFormat,
    billDateBs:billFormat === BillTypeEnum.DEVNAGARI ? toIsoParsableDateOrNull(data['bill_date_bs'] ?? data['billDateBs']) : null,

  };
}
