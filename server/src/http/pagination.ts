import z from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export function parsePagination(query: unknown) {
  const { page, limit } = paginationSchema.parse(query);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
