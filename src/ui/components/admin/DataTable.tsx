interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}

export default function DataTable({ columns, data, onRowClick, emptyMessage = 'Veri bulunamadı' }: DataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6 sm:p-12 text-center">
        <span className="material-icons-round text-slate-600 text-4xl sm:text-5xl mb-3 inline-block">inbox</span>
        <p className="text-slate-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-card-dark border border-aged-gold/20 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-aged-gold/10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="text-left px-3 sm:px-6 py-2.5 sm:py-4 text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-aged-gold/10">
            {data.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className={`
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}
                `}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-3 sm:px-6 py-2.5 sm:py-4 text-xs sm:text-sm text-slate-300">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
