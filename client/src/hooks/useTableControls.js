import { useMemo, useState } from 'react';

export function useTableControls(records, {
    searchFields,
    dateField,
    amountField = 'amount',
    statusField,
    categoryField,
    defaultSort,
    defaultDirection = 'asc',
}) {
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');
    const [sortField, setSortField] = useState(defaultSort);
    const [sortDirection, setSortDirection] = useState(defaultDirection);
    const categories = useMemo(() => categoryField
        ? [...new Set(records.map(record => record[categoryField]).filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
        : [], [records, categoryField]);
    const filteredRecords = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return records
            .filter(record => {
            const recordDate = String(record[dateField] || '').slice(0, 10);
            const amount = Number(record[amountField]);
            return (!query || searchFields.some(field => String(record[field] ?? '').toLocaleLowerCase().includes(query)))
                && (!fromDate || recordDate >= fromDate)
                && (!toDate || recordDate <= toDate)
                && (minAmount === '' || amount >= Number(minAmount))
                && (maxAmount === '' || amount <= Number(maxAmount))
                && (!statusField || !status || record[statusField] === status)
                && (!categoryField || !category || record[categoryField] === category);
        })
            .sort((a, b) => {
            const left = a[sortField];
            const right = b[sortField];
            const leftNumber = Number(left);
            const rightNumber = Number(right);
            const comparison = left !== '' && right !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
                ? leftNumber - rightNumber
                : String(left ?? '').localeCompare(String(right ?? ''), undefined, { sensitivity: 'base', numeric: true });
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [records, search, fromDate, toDate, minAmount, maxAmount, status, category, dateField, amountField, statusField, categoryField, searchFields, sortField, sortDirection]);
    const resetKey = JSON.stringify([search, fromDate, toDate, minAmount, maxAmount, status, category, sortField, sortDirection]);
    const sortBy = field => {
        if (sortField === field) {
            setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    const clear = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setMinAmount('');
        setMaxAmount('');
        setStatus('');
        setCategory('');
        setSortField(defaultSort);
        setSortDirection(defaultDirection);
    };
    return {
        records: filteredRecords,
        resetKey,
        categories,
        values: { search, fromDate, toDate, minAmount, maxAmount, status, category, sortField, sortDirection },
        setters: { setSearch, setFromDate, setToDate, setMinAmount, setMaxAmount, setStatus, setCategory, setSortField, setSortDirection },
        sortBy,
        clear,
    };
}
