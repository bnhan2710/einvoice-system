import { Inject, Injectable } from '@nestjs/common';
import { ProductRepository, ProductUseCase } from '../../domain/ports/product.port';
import { PRODUCT_REPOSITORY } from '../../product.di-tokens';
import { Product } from '../../domain/entities/product.entity';
import { CreateProductInput } from '../dtos/create-product.input';
import { SKU, Price } from '../../domain';

import { ProductAlreadyExistsException, InvalidProductDataException } from '../../domain/exceptions';

@Injectable()
export class ProductUseCaseImpl implements ProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository) {}
  async create(data: CreateProductInput): Promise<Product> {
    // validate required fields
    if (!data.sku || !data.name || !data.unit || data.price == null) {
      throw new InvalidProductDataException('Missing required product fields');
    }

    // check for existing product by SKU or name
    const exists = await this.productRepo.existsBySkuOrName(data.sku, data.name);
    if (exists) {
      throw new ProductAlreadyExistsException(`Product with SKU ${data.sku} or name ${data.name} already exists`);
    }

    const newProduct = new Product(
      null,
      data.name,
      SKU.create(data.sku),
      data.unit,
      Price.create(data.price),
      data.vatRate || 0,
      data.description || '',
    );

    return await this.productRepo.save(newProduct);
  }

  async getList(): Promise<Product[]> {
    return this.productRepo.findAll();
  }
}
