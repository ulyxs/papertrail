import { useState } from 'react';
export function usePagination(records, pageSize = 10, resetKey) {
    const [paginationState, setPaginationState] = useState(() => ({
        page: 1,
        total: records.length,
        resetKey,
    }));
    const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
    // Search/filter changes and record-count changes return the list to its first valid page.
    const resetRequired = paginationState.total !== records.length || !Object.is(paginationState.resetKey, resetKey);
    const requestedPage = resetRequired ? 1 : paginationState.page;
    const page = Math.min(requestedPage, pageCount);
    const start = (page - 1) * pageSize;
    return {
        records: records.slice(start, start + pageSize),
        page,
        pageCount,
        total: records.length,
        pageSize,
        setPage: nextPage => setPaginationState({ page: nextPage, total: records.length, resetKey }),
    };
}
