import { Repository } from 'typeorm';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { BillInfo } from '@modules/ocr/models/bill-info.model';
import { BillItem } from '@modules/ocr/models/bill-item.model';
import { ApiLog } from '@modules/ocr/models/api-log.model';

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
}

export interface CreateApiLogInput {
  url: string;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  requestedOn: Date;
  responseOn?: Date | null;
  status?: string | null;
  ownerType: string;
  ownerId: string;
}

export class BillInfoRepository {
  private get billInfoRepo(): Repository<BillInfo> {
    return AppDataSource.getRepository(BillInfo);
  }

  private get billItemRepo(): Repository<BillItem> {
    return AppDataSource.getRepository(BillItem);
  }

  private get apiLogRepo(): Repository<ApiLog> {
    return AppDataSource.getRepository(ApiLog);
  }

  async create(input: CreateBillInfoInput): Promise<BillInfo> {
    return AppDataSource.transaction(async (manager) => {
      const billInfo = manager.create(BillInfo, {
        jobId: input.jobId,
        merchantName: input.merchantName ?? null,
        merchantAddress: input.merchantAddress ?? null,
        billDate: input.billDate ?? null,
        billTime: input.billTime ?? null,
        currency: input.currency ?? null,
        subtotalAmount: input.subtotalAmount ?? null,
        taxAmount: input.taxAmount ?? null,
        serviceCharge: input.serviceCharge ?? null,
        tipAmount: input.tipAmount ?? null,
        discountAmount: input.discountAmount ?? null,
        totalAmount: input.totalAmount ?? null,
        udf1: input.udf1 ?? null,
        udf2: input.udf2 ?? null,
      });

      const savedBillInfo = await manager.save(BillInfo, billInfo);

      if (input.items.length > 0) {
        const billItems = input.items.map((item) =>
          manager.create(BillItem, {
            billId: savedBillInfo.id,
            itemName: item.itemName ?? null,
            quantity: item.quantity ?? null,
            unitPrice: item.unitPrice ?? null,
            totalPrice: item.totalPrice ?? null,
          }),
        );
        await manager.save(BillItem, billItems);
      }

      return manager.findOneOrFail(BillInfo, { where: { id: savedBillInfo.id } });
    });
  }

  async findByJobId(jobId: string): Promise<BillInfo | null> {
    return this.billInfoRepo.findOne({ where: { jobId } });
  }

  async logApiCall(input: CreateApiLogInput): Promise<ApiLog> {
    const log = this.apiLogRepo.create({
      url: input.url,
      requestPayload: input.requestPayload ?? null,
      responsePayload: input.responsePayload ?? null,
      requestedOn: input.requestedOn,
      responseOn: input.responseOn ?? null,
      status: input.status ?? null,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    });
    return this.apiLogRepo.save(log);
  }
}
