import { TypeOrmProvider } from '@common/configuration/typeorm.config';
import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './infrastructure/persistence/entities/product.orm-entity';
import { PRODUCT_REPOSITORY, PRODUCT_USECASE } from './product.di-tokens';
import { ProductUseCaseImpl } from './application/use-cases/product.usecase';
import { ProductPostgresRepository } from './infrastructure/persistence/postgresql/product-postgres.repo';
import { ProductTcpController } from './presentation/product-tcp.controller';

const dependencies: Provider[] = [
  { provide: PRODUCT_USECASE, useClass: ProductUseCaseImpl },
  { provide: PRODUCT_REPOSITORY, useClass: ProductPostgresRepository },
];

@Module({
  imports: [TypeOrmProvider, TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductTcpController],
  providers: [...dependencies],
  exports: [...dependencies],
})
export class ProductModule {}
