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
