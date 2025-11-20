function paginate({ records, page = 1, limit = 10, totalRecords = 0 }) {
  const safeLimit = limit || 10;
  const totalPages = safeLimit > 0 ? Math.ceil(totalRecords / safeLimit) : 0;

  return {
    records,
    page,
    limit: safeLimit,
    totalPages,
    totalRecords,
  };
}

module.exports = { paginate };
