/**
 * Generic base repository contract.
 * All domain-specific repositories extend or implement this.
 */
export interface IBaseRepository<Model> {
  findById(id: string): Promise<Model | null>;
  findAll(): Promise<Model[]>;
  create(data: Partial<Model>): Promise<Model>;
  update(id: string, data: Partial<Model>): Promise<Model | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Generic use-case contract following the Command pattern.
 */
export interface IBaseUseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
