import { Controller, Inject } from '@nestjs/common';
import { SEND_INVOICE_SAGA_COORDINATOR } from '../../invoice.di-tokens';
import { ISagaCoordinator } from '../../application/ports/invoice.port';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoiceProcessPayload } from '@common/interfaces/queue/invoice';
import { INVOICE_EVENTS } from '@common/constants/enum/event/event.enum';

@Controller()
export class InvoiceProcessKafkaConsumer {
  constructor(
    @Inject(SEND_INVOICE_SAGA_COORDINATOR)
    private readonly saga: ISagaCoordinator,
  ) {}

  @MessagePattern(INVOICE_EVENTS.INVOICE_PROCESS_SEND_EVENT)
  async handleInvoiceProcess(@Payload() payload: InvoiceProcessPayload) {
    await this.saga.execute(payload);
  }
}
