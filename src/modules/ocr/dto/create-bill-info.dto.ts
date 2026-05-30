export interface CreateBillInfoInput {
  jobId: string;
  merchantName?: string | null;
  merchantAddress?: string | null;
  billDate?: string | null;
  billTime?: string | null;
  currency?: string | null;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  serviceCharge?: number | null;
  tipAmount?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  udf1?: string | null;
  udf2?: string | null;
  items: Array<{
    itemName?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
  }>;
  billFormat?: string | null;
  billDateBs?: string | null;
}
