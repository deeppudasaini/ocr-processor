import { Repository } from 'typeorm';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { BillInfo } from '@modules/ocr/models/bill-info.model';
import { BillItem } from '@modules/ocr/models/bill-item.model';
import { ApiLog } from '@modules/ocr/models/api-log.model';
import { CreateBillInfoInput } from '@modules/ocr/dto/create-bill-info.dto';
import { IBaseRepository } from '@shared/interfaces';
import { CreateApiLogInput } from '@modules/ocr/dto/create-api-log.dto';
import { log } from 'winston';

export class BillInfoRepository implements IBaseRepository<BillInfo> {
  private get billInfoRepo(): Repository<BillInfo> {
    return AppDataSource.getRepository(BillInfo);
  }

  private get billItemRepo(): Repository<BillItem> {
    return AppDataSource.getRepository(BillItem);
  }

  private get apiLogRepo(): Repository<ApiLog> {
    return AppDataSource.getRepository(ApiLog);
  }

  async saveBillsInTransaction(input: CreateBillInfoInput): Promise<BillInfo> {
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
        billFormat:input.billFormat ?? null,
        udf1: input.udf1 ?? null,
        udf2: input.udf2 ?? null,
        billDateBs: input.billDateBs ?? null,
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

  delete(id: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  findAll(): Promise<BillInfo[]> {
    return Promise.resolve([]);
  }

  findById(id: string): Promise<BillInfo | null> {
    return Promise.resolve(null);
  }

  update(id: string, data: Partial<BillInfo>): Promise<BillInfo | null> {
    return Promise.resolve(null);
  }

  create(data: Partial<BillInfo>): Promise<BillInfo> {
    return Promise.resolve(new BillInfo());
  }
}
