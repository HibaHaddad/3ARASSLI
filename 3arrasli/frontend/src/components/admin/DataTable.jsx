import React from "react";

const DataTable = ({ columns, rows, keyField, loading, emptyMessage, renderActions }) => {
  if (loading) {
    return <div className="admin-status-card">Chargement des donnees...</div>;
  }

  if (!rows.length) {
    return <div className="admin-status-card">{emptyMessage}</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
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
                <td key={`${row[keyField]}-${column.key}`}>
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
