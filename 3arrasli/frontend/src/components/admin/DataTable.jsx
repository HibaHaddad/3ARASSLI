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
  pagination = null,
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

      {pagination && pagination.totalPages > 1 ? (
        <div className="admin-table-pagination">
          <p>
            {pagination.totalItemsLabel ||
              `${pagination.totalItems} element${pagination.totalItems > 1 ? "s" : ""}`} - Page {pagination.page} /{" "}
            {pagination.totalPages}
          </p>
          <div className="admin-table-pagination-actions">
            <button
              type="button"
              className="provider-ghost-btn"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
            >
              Precedent
            </button>
            <button
              type="button"
              className="provider-ghost-btn"
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DataTable;
