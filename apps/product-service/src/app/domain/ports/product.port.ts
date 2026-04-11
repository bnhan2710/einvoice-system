import { CreateProductTcpRequest } from '@common/interfaces/tcp/product';
import { Product } from '../entities/product.entity';

export interface ProductUseCase {
  create(data: CreateProductTcpRequest): Promise<Product>;
  getList(): Promise<Product[]>;
}

export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  existsBySkuOrName(sku: string, name: string): Promise<boolean>;
}
