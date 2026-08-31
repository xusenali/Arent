export default function DataTable({ columns, rows, rowKey, emptyMessage = "Ma'lumot topilmadi" }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              className="border-b border-border last:border-b-0 hover:bg-surface-hover"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-4 text-text">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
