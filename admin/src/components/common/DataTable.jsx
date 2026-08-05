import Loader from './Loader';

const DataTable = ({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  keyField = 'id',
}) => {
  if (loading) {
    return (
      <div className="yulo-card p-5">
        <Loader text="Fetching data..." />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="yulo-card p-5 text-center text-muted">
        <i className="bi bi-inbox display-4 d-block mb-3 opacity-50" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-responsive yulo-card">
      <table className="table table-hover yulo-table mb-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row[keyField] ?? idx}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
