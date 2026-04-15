import { SagaInstance, SagaInstanceModel, SagaInstanceModelName } from '@common/schemas/saga.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { SAGA_STEP_STATUS, SAGA_TYPES } from '@common/constants/enum/saga/saga.enum';
import { SagaOrchestrationRepository } from '../application/saga.port';
import { SAGA_STATUS } from '@common/constants/enum/saga/saga.enum';

@Injectable()
export class SagaOrchestrationMongoRepo implements SagaOrchestrationRepository {
  constructor(
    @InjectModel(SagaInstanceModelName)
    private readonly sagaInstanceModel: SagaInstanceModel,
  ) {}

  async create(sagaType: SAGA_TYPES, context: Record<string, any>, stepNames: string[]) {
    const steps = stepNames.map((name) => ({
      stepName: name,
      status: SAGA_STEP_STATUS.PENDING,
    }));
    const sagaInstance = new this.sagaInstanceModel({
      sagaType,
      context,
      steps,
      currentStep: 0,
      status: SAGA_STATUS.PENDING,
    });
    return sagaInstance.save();
  }

  async findById(id: string) {
    return this.sagaInstanceModel.findById(id).exec();
  }

  async updateStatus(id: string, status: SAGA_STATUS, error?: string) {
    const update: Partial<SagaInstance> = { status };
    if (error !== undefined) {
      update.error = error;
    }

    return this.sagaInstanceModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async updateCurrentStep(id: string, stepIndex: number) {
    return this.sagaInstanceModel.findByIdAndUpdate(id, { currentStep: stepIndex }, { new: true }).exec();
  }

  async updateContext(id: string, context: Record<string, any>) {
    return this.sagaInstanceModel.findByIdAndUpdate(id, { context }, { new: true }).exec();
  }

  async markStepRunning(id: string, stepIndex: number) {
    return this.sagaInstanceModel
      .findByIdAndUpdate(
        id,
        {
          [`steps.${stepIndex}.status`]: SAGA_STEP_STATUS.RUNNING,
          [`steps.${stepIndex}.startedAt`]: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async markStepCompleted(id: string, stepIndex: number, data?: any) {
    return this.sagaInstanceModel
      .findByIdAndUpdate(
        id,
        {
          [`steps.${stepIndex}.status`]: SAGA_STEP_STATUS.COMPLETED,
          [`steps.${stepIndex}.completedAt`]: new Date(),
          [`steps.${stepIndex}.data`]: data || null,
        },
        { new: true },
      )
      .exec();
  }

  async markStepFailed(id: string, stepIndex: number, error: string) {
    return this.sagaInstanceModel
      .findByIdAndUpdate(
        id,
        {
          [`steps.${stepIndex}.status`]: SAGA_STEP_STATUS.FAILED,
          [`steps.${stepIndex}.completedAt`]: new Date(),
          [`steps.${stepIndex}.error`]: error,
        },
        { new: true },
      )
      .exec();
  }

  async markStepCompensated(id: string, stepIndex: number) {
    return this.sagaInstanceModel
      .findByIdAndUpdate(
        id,
        {
          [`steps.${stepIndex}.status`]: SAGA_STEP_STATUS.COMPENSATED,
          [`steps.${stepIndex}.completedAt`]: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async markStepCompensating(sagaId: string, stepIndex: number) {
    return this.sagaInstanceModel
      .findByIdAndUpdate(
        sagaId,
        {
          [`steps.${stepIndex}.status`]: SAGA_STEP_STATUS.COMPENSATING,
        },
        { new: true },
      )
      .exec();
  }
}
