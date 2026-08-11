import "server-only";

/**
 * Minimal structural type describing the subset of a Prisma model delegate the
 * repository layer relies on. Concrete repositories pass e.g. `prisma.user`.
 */
export interface CrudDelegate<
  Entity,
  CreateInput,
  UpdateInput,
  WhereInput,
  WhereUniqueInput,
  OrderByInput,
> {
  findMany(args?: {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: OrderByInput;
  }): Promise<Entity[]>;
  findUnique(args: { where: WhereUniqueInput }): Promise<Entity | null>;
  create(args: { data: CreateInput }): Promise<Entity>;
  update(args: { where: WhereUniqueInput; data: UpdateInput }): Promise<Entity>;
  delete(args: { where: WhereUniqueInput }): Promise<Entity>;
  count(args?: { where?: WhereInput }): Promise<number>;
}

export interface PaginatedResult<Entity> {
  items: Entity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Generic data-access base class. Concrete repositories bind the entity types
 * from the generated Prisma client, keeping database access uniform and testable
 * while removing per-model CRUD boilerplate.
 *
 * Example (future phase):
 *   class UserRepository extends BaseRepository<User, ...> {
 *     protected get delegate() { return prisma.user; }
 *   }
 */
export abstract class BaseRepository<
  Entity,
  CreateInput,
  UpdateInput,
  WhereInput,
  WhereUniqueInput,
  OrderByInput,
> {
  protected abstract get delegate(): CrudDelegate<
    Entity,
    CreateInput,
    UpdateInput,
    WhereInput,
    WhereUniqueInput,
    OrderByInput
  >;

  findById(where: WhereUniqueInput): Promise<Entity | null> {
    return this.delegate.findUnique({ where });
  }

  create(data: CreateInput): Promise<Entity> {
    return this.delegate.create({ data });
  }

  update(where: WhereUniqueInput, data: UpdateInput): Promise<Entity> {
    return this.delegate.update({ where, data });
  }

  remove(where: WhereUniqueInput): Promise<Entity> {
    return this.delegate.delete({ where });
  }

  count(where?: WhereInput): Promise<number> {
    return this.delegate.count({ where });
  }

  async paginate(params: {
    page: number;
    pageSize: number;
    where?: WhereInput;
    orderBy?: OrderByInput;
  }): Promise<PaginatedResult<Entity>> {
    const { page, pageSize, where, orderBy } = params;
    const [total, items] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
