import { useState, useMemo } from 'react';
import { safeArray } from '../utils/dataGuards';

export default function DataTable({ 
  columns, 
  data, 
  onRowClick, 
  emptyMessage = 'Chưa có dữ liệu',
  emptyIcon = '📭',
  searchable = true,
  searchPlaceholder = 'Tìm kiếm...'
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    const rows = safeArray(data);
    if (!searchTerm || !searchable) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(item =>
      columns.some(col => {
        // If there's a custom render, it's hard to search raw value, search stringified object as fallback
        if (col.render) return false;
        const val = item[col.key];
        return val ? String(val).toLowerCase().includes(term) : false;
      }) || JSON.stringify(item).toLowerCase().includes(term)
    );
  }, [data, searchTerm, columns, searchable]);

  return (
    <div>
      {searchable && (
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      {filteredData.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">{emptyIcon}</div>
            <p>{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} style={col.width ? { width: col.width } : {}}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={onRowClick ? { cursor: 'pointer' } : {}}
                  className={item.status === 'overdue' ? 'overdue' : ''}
                >
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(item) : (item[col.key] !== undefined ? item[col.key] : '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
