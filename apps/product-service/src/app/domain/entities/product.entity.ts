import { SKU, Price } from '../value-objects';

export class Product {
  constructor(
    public readonly id: string | null,
    public name: string,
    public sku: SKU,
    public unit: string,
    public price: Price,
    public vatRate: number,
    public description?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  calculateTotalPrice(quantity: number): number {
    return this.price.getAmount() * quantity * (1 + this.vatRate);
  }

  isValid(): boolean {
    return this.price.getAmount() > 0 && this.vatRate >= 0 && this.sku.getValue().length > 0;
  }
}
