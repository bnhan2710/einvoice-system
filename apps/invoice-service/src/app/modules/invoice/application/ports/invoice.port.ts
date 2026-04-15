import { CreateInvoiceTcpRequest, SendInvoiceTcpReq } from '@common/interfaces/tcp/invoice';
import { Invoice } from '@common/schemas/invoice.schema';
import { InvoiceProcessPayload, InvoiceSentPayload } from '@common/interfaces/queue/invoice';

export interface IInvoiceRepository {
  create(data: Partial<Invoice>);
  getById(id: string): Promise<Invoice | null>;
  updateById(id: string, data: Partial<Invoice>): Promise<Invoice | null>;
  deleteById(id: string): Promise<Invoice | null>;
}

export interface IInvoiceService {
  create(params: CreateInvoiceTcpRequest);
  getById(id: string): Promise<Invoice>;
  sendById(params: SendInvoiceTcpReq, processId: string);
  updateInvoicePaid(invoiceId: string);
}

export interface IInvoiceEventPublisher {
  publishInvoiceProcessSendEvent(payload: InvoiceProcessPayload);
  publishInvoiceSentEvent(payload: InvoiceSentPayload);
}

export interface ISagaCoordinator {
  execute(payload: InvoiceProcessPayload): Promise<void>;
}
