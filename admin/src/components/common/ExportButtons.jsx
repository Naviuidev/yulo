import { downloadCSV, downloadJSON, printAsPDF, tableToHtml } from '../../utils/export';

const ExportButtons = ({ data = [], columns, filename = 'yulo-export', title = 'Report' }) => {
  const handleCSV = () => {
    const rows = data.map((row) => {
      const obj = {};
      (columns || Object.keys(row)).forEach((c) => {
        const key = typeof c === 'string' ? c : c.key;
        const label = typeof c === 'string' ? c : c.label;
        obj[label || key] = row[key];
      });
      return obj;
    });
    downloadCSV(rows, `${filename}.csv`);
  };

  const handleExcel = () => handleCSV();

  const handlePDF = () => {
    const cols = columns?.map((c) =>
      typeof c === 'string' ? { key: c, label: c } : c
    );
    printAsPDF(title, tableToHtml(data, cols));
  };

  const handleJSON = () => downloadJSON(data, `${filename}.json`);

  return (
    <div className="btn-group">
      <button type="button" className="btn btn-outline-dark btn-sm" onClick={handleCSV} disabled={!data.length}>
        <i className="bi bi-filetype-csv me-1" /> CSV
      </button>
      <button type="button" className="btn btn-outline-dark btn-sm" onClick={handleExcel} disabled={!data.length}>
        <i className="bi bi-file-earmark-spreadsheet me-1" /> Excel
      </button>
      <button type="button" className="btn btn-outline-dark btn-sm" onClick={handlePDF} disabled={!data.length}>
        <i className="bi bi-file-earmark-pdf me-1" /> PDF
      </button>
      <button type="button" className="btn btn-outline-dark btn-sm" onClick={handleJSON} disabled={!data.length}>
        <i className="bi bi-braces me-1" /> JSON
      </button>
    </div>
  );
};

export default ExportButtons;
