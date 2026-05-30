import { BillTypeEnum } from '@modules/ocr/constants/bill-type.enum';

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
  billFormat: BillTypeEnum | null;
  billDateBs:string|null
}
