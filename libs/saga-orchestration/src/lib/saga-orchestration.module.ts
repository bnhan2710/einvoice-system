import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SagaInstanceDestination } from '@common/schemas/saga.schema';
import { SAGA_ORCHESTRATION_REPOSITORY } from './saga.di-tokens';
import { SagaOrchestrationMongoRepo } from './infrastrucutre/saga-orchestration.mongo-repo';
import { SagaOrchestrationService } from './application/saga-orchestration.service';

const dependencies: Provider[] = [
  SagaOrchestrationService,
  {
    provide: SAGA_ORCHESTRATION_REPOSITORY,
    useClass: SagaOrchestrationMongoRepo,
  },
];

@Module({})
export class SagaOrchestrationModule {
  static forRoot(): DynamicModule {
    return {
      module: SagaOrchestrationModule,
      global: true,
      imports: [MongooseModule.forFeature([SagaInstanceDestination])],
      providers: dependencies,
      exports: [SagaOrchestrationService],
    };
  }
}
