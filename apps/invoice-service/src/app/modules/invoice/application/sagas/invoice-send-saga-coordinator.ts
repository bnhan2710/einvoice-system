import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IInvoiceRepository, IInvoiceEventPublisher, ISagaCoordinator } from '../ports/invoice.port';
import { INVOICE_EVENT_PUBLISHER, INVOICE_REPOSITORY } from '../../invoice.di-tokens';
import { PAYMENT_SERVICE } from '../../../payment/payment.di-tokens';
import { IPaymentService } from '../../../payment/application/ports/payment.port';
import { Invoice } from '@common/schemas/invoice.schema';
import { INVOICE_STATUS } from '@common/constants/enum/invoice.enum';
import { createSessionMapping } from '../mappers';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { firstValueFrom } from 'rxjs';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message.enum';
import { UploadFileTcpReq } from '@common/interfaces/tcp/media';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { map } from 'rxjs';
import { SagaOrchestrationService } from '@common/saga-orchestration/application/saga-orchestration.service';
import { INVOICE_SEND_SAGA_STEP, SAGA_TYPES } from '@common/constants/enum/saga/saga.enum';
import { InvoiceSendSagaContext, SagaStep } from '@common/interfaces/saga';
import { InvoiceProcessPayload } from '@common/interfaces/queue/invoice';
import { ERROR_CODE } from '@common/constants/enum/error-code.enum';

@Injectable()
export class SendInvoiceSagaCoordinator implements ISagaCoordinator {
  private readonly logger = new Logger(SendInvoiceSagaCoordinator.name);

  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: IInvoiceRepository,
    @Inject(PAYMENT_SERVICE) private readonly paymentService: IPaymentService,
    @Inject(INVOICE_EVENT_PUBLISHER) private readonly invoiceEventPublisher: IInvoiceEventPublisher,
    @Inject(TCP_SERVICES.PDF_GENERATOR_SERVICE) private readonly pdfGeneratorClient: TcpClient,
    @Inject(TCP_SERVICES.MEDIA_SERVICE) private readonly mediaClient: TcpClient,
    private readonly sagaOrchestration: SagaOrchestrationService,
  ) {}

  async execute(payload: InvoiceProcessPayload): Promise<void> {
    const { invoiceId, userId, processId } = payload;
    const invoice = await this.invoiceRepository.getById(invoiceId);

    if (!invoice) {
      throw new NotFoundException(ERROR_CODE.INVOICE_NOT_FOUND);
    }

    const context: InvoiceSendSagaContext = {
      sagaId: '',
      invoiceId,
      userId,
      processId,
    };

    const steps = this.buildSendInvoiceSteps(invoice);

    try {
      await this.sagaOrchestration.execute(SAGA_TYPES.INVOICE_SEND, steps, context, {
        transientContextKeys: ['pdfBase64'],
      });
    } catch (error) {
      await this.invoiceRepository.updateById(invoiceId, {
        status: INVOICE_STATUS.FAILED,
      });
      throw error;
    }
  }

  private buildSendInvoiceSteps(invoice: Invoice): SagaStep<InvoiceSendSagaContext>[] {
    return [
      {
        name: INVOICE_SEND_SAGA_STEP.GENERATE_PDF,
        execute: async (ctx) => {
          const pdfBase64 = await this.generatorInvoicePdf(invoice, ctx.processId);
          return { success: true, data: { pdfBase64 } };
        },
      },
      {
        name: INVOICE_SEND_SAGA_STEP.UPLOAD_FILE,
        execute: async (ctx) => {
          if (!ctx.pdfBase64) {
            return { success: false, error: 'Missing pdfBase64' };
          }
          const fileUrl = await this.uploadFile(
            {
              fileBase64: ctx.pdfBase64,
              fileName: `invoice-${invoice._id}`,
            },
            ctx.processId,
          );
          return { success: true, data: { fileUrl } };
        },
        compensate: async (ctx) => {
          if (ctx.fileUrl) {
            await this.deleteFile(ctx.fileUrl, ctx.processId);
          }
        },
      },
      {
        name: INVOICE_SEND_SAGA_STEP.CREATE_PAYMENT_LINK,
        execute: async () => {
          const checkoutSession = await this.paymentService.createCheckoutSession(createSessionMapping(invoice));
          return {
            success: true,
            data: {
              paymentLink: checkoutSession.url,
              sessionId: checkoutSession.sessionId,
            },
          };
        },
        compensate: async (ctx) => {
          if (ctx.sessionId) {
            await this.paymentService.cancelCheckoutSession(ctx.sessionId);
          }
        },
      },
      {
        name: INVOICE_SEND_SAGA_STEP.FINALIZE_SEND,
        execute: async (ctx) => {
          if (!ctx.paymentLink || !ctx.fileUrl) {
            return { success: false, error: 'Missing payment link or file URL' };
          }
          this.logger.log(`Payment link: ${ctx.paymentLink}`);
          await this.invoiceEventPublisher.publishInvoiceSentEvent({
            id: ctx.invoiceId,
            paymentLink: ctx.paymentLink,
          });

          await this.invoiceRepository.updateById(ctx.invoiceId, {
            status: INVOICE_STATUS.SENT,
            fileUrl: ctx.fileUrl,
          });
          return { success: true };
        },
      },
    ];
  }

  async generatorInvoicePdf(data: Invoice, processId: string) {
    return firstValueFrom(
      this.pdfGeneratorClient
        .send<string, Invoice>(TCP_REQUEST_MESSAGE.PDF_GENERATOR.CREATE_INVOICE_PDF, {
          data,
          processId,
        })
        .pipe(map((response) => response.data)),
    );
  }

  uploadFile(data: UploadFileTcpReq, processId: string) {
    return firstValueFrom(
      this.mediaClient
        .send<string, UploadFileTcpReq>(TCP_REQUEST_MESSAGE.MEDIA.UPLOAD_FILE, {
          data,
          processId,
        })
        .pipe(map((data) => data.data)),
    );
  }

  deleteFile(fileUrl: string, processId: string) {
    return firstValueFrom(
      this.mediaClient
        .send<boolean, string>(TCP_REQUEST_MESSAGE.MEDIA.DELETE_FILE, {
          data: fileUrl,
          processId,
        })
        .pipe(map((data) => data.data)),
    );
  }
}
