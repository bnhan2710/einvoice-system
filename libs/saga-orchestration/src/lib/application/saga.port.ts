import { SAGA_STATUS, SAGA_TYPES } from '@common/constants/enum/saga/saga.enum';

export interface SagaOrchestrationRepository {
  create(sagaType: SAGA_TYPES, context: Record<string, any>, stepNames: string[]): Promise<any>;
  findById(id: string): Promise<any>;
  updateStatus(id: string, status: SAGA_STATUS, error?: string): Promise<any>;
  updateCurrentStep(id: string, stepIndex: number): Promise<any>;
  updateContext(id: string, context: Record<string, any>): Promise<any>;
  markStepRunning(id: string, stepIndex: number): Promise<any>;
  markStepCompleted(id: string, stepIndex: number, data?: any): Promise<any>;
  markStepFailed(id: string, stepIndex: number, error: string): Promise<any>;
  markStepCompensated(id: string, stepIndex: number): Promise<any>;
  markStepCompensating(id: string, stepIndex: number): Promise<any>;
}
