import { Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceDestination } from '@common/schemas/invoice.schema';
import { INVOICE_REPOSITORY, INVOICE_SERVICE } from './invoice.di-tokens';
import { InvoiceService } from './application/services/invoice.service';
import { InvoiceMongoRepository } from './infrastructure/persistence/mongodb/invoice-mongo.repo';
import { InvoiceTcpController } from './presentation/tcp/invoice-tcp.controller';
import { MongoProvider } from '@common/configuration/mongo.config';
import { ClientsModule } from '@nestjs/microservices';
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { PaymentModule } from '../payment/payment.module';
import { KafkaModule } from '@common/kafka/kafka.module';
import { QUEUE_SERVICES } from '@common/constants/enum/queue/queue.enum';
import { InvoiceProcessKafkaConsumer } from './presentation/kafka/invoice-kafka.consumer';
import { InvoiceKafkaPublisher } from './infrastructure/messaging/kafka/invoice-kafka.publisher';
import { INVOICE_EVENT_PUBLISHER } from './invoice.di-tokens';
import { SEND_INVOICE_SAGA_COORDINATOR } from './invoice.di-tokens';
import { SendInvoiceSagaCoordinator } from './application/sagas/invoice-send-saga-coordinator';
import { SagaOrchestrationModule } from '@common/saga-orchestration/saga-orchestration.module';

const dependencies: Provider[] = [
  { provide: INVOICE_SERVICE, useClass: InvoiceService },
  { provide: INVOICE_REPOSITORY, useClass: InvoiceMongoRepository },
  { provide: INVOICE_EVENT_PUBLISHER, useClass: InvoiceKafkaPublisher },
  { provide: SEND_INVOICE_SAGA_COORDINATOR, useClass: SendInvoiceSagaCoordinator },
];

@Module({
  imports: [
    MongoProvider,
    SagaOrchestrationModule.forRoot(),
    MongooseModule.forFeature([InvoiceDestination]),
    ClientsModule.registerAsync([
      TcpProvider(TCP_SERVICES.PDF_GENERATOR_SERVICE),
      TcpProvider(TCP_SERVICES.MEDIA_SERVICE),
    ]),
    PaymentModule,
    KafkaModule.register(QUEUE_SERVICES.INVOICE),
  ],
  controllers: [InvoiceTcpController, InvoiceProcessKafkaConsumer],
  providers: [...dependencies],
})
export class InvoiceModule {}
