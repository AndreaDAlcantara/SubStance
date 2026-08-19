import ExcelJS from "exceljs";
import { Readable } from "node:stream";

async function loadFirstWorksheet(file: File): Promise<ExcelJS.Worksheet> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  const workbook = new ExcelJS.Workbook();
  if (isCsv) {
    return workbook.csv.read(Readable.from(buffer));
  }
  // @ts-expect-error exceljs's bundled types predate current @types/node's generic
  // Buffer<TArrayBuffer> — this is a real Buffer at runtime, just a type mismatch.
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in file");
  return worksheet;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const h = value.getUTCHours().toString().padStart(2, "0");
    const m = value.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String((value as { result: unknown }).result ?? "").trim();
  }
  return String(value).trim();
}

/** Reads the first worksheet of a CSV/XLSX file into row objects keyed by header text. */
export async function parseSpreadsheetRows(file: File): Promise<Record<string, string>[]> {
  const worksheet = await loadFirstWorksheet(file);

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value);
  });

  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    if (row.cellCount === 0) continue;

    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, colNumber) => {
      if (!header) return;
      const str = cellToString(row.getCell(colNumber).value);
      if (str) hasValue = true;
      obj[header] = str;
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}
