import React from "react";

const DataTable = ({
  columns,
  rows,
  keyField,
  loading,
  emptyMessage,
  renderActions,
  wrapClassName = "",
  tableClassName = "",
  actionsColumnWidth = "",
}) => {
  if (loading) {
    return <div className="admin-status-card">Chargement des donnees...</div>;
  }

  if (!rows.length) {
    return <div className="admin-status-card">{emptyMessage}</div>;
  }

  return (
    <div className={`admin-table-wrap ${wrapClassName}`.trim()}>
      <table className={`admin-data-table ${tableClassName}`.trim()}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
          {renderActions ? <col style={actionsColumnWidth ? { width: actionsColumnWidth } : undefined} /> : null}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.headerClassName || ""}>
                {column.header}
              </th>
            ))}
            {renderActions ? <th scope="col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((column) => (
                <td key={`${row[keyField]}-${column.key}`} className={column.cellClassName || ""}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
              {renderActions ? <td className="admin-table-actions">{renderActions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
