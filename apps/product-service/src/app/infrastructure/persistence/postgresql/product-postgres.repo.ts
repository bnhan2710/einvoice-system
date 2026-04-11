import { Product } from '../../../domain/entities/product.entity';
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/ports/product.port';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductMapper } from '../../mappers/product.mapper';
import { ProductEntity } from '../entities/product.orm-entity';

@Injectable()
export class ProductPostgresRepository implements ProductRepository {
  constructor(@InjectRepository(ProductEntity) private readonly repo: Repository<ProductEntity>) {}

  async save(product: Product): Promise<Product> {
    const entity = ProductMapper.toPersistence(product);
    const savedEntity = await this.repo.save(entity);
    return ProductMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ProductMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Product[]> {
    const entities = await this.repo.find();
    return entities.map(ProductMapper.toDomain);
  }

  async existsBySkuOrName(sku: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: [{ sku }, { name }] });
    return count > 0;
  }
}
