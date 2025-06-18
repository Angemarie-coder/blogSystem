export async function paginate<T>(
  model: any,
  options: any
): Promise<any> {
  const { page = 1, limit = 10, ...findOptions } = options;
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  // Get total count
  const count = await model.count(findOptions);
  
  // Get data with pagination
  const data = await model.findAll({
    ...findOptions,
    limit,
    offset
  });
  
  // Calculate total pages
  const totalPages = Math.ceil(count / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages
    }
  };
}