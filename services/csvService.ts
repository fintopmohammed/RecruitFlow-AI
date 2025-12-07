import { read, utils } from 'xlsx';

/**
 * Simple CSV parser that handles basic comma separation.
 * Does not handle complex quoted newlines for simplicity in this demo,
 * but handles quoted fields on the same line.
 */
export const parseCSV = (content: string): Record<string, string>[] => {
  const lines = content.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine.trim()) continue;

    const values = parseLine(currentLine);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    data.push(row);
  }

  return data;
};

const parseLine = (text: string): string[] => {
  const result: string[] = [];
  let curVal = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          curVal += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        curVal += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        result.push(curVal);
        curVal = '';
      } else {
        curVal += char;
      }
    }
  }
  result.push(curVal);
  return result;
};

export const parseExcel = (buffer: ArrayBuffer): Record<string, string>[] => {
  const workbook = read(buffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) return [];
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // raw: false ensures we get the formatted string representation (good for phones/dates)
  // defval: "" ensures we don't skip empty cells if they are mapped to headers
  const jsonData = utils.sheet_to_json(worksheet, { 
    defval: "",
    raw: false 
  });
  
  return jsonData as Record<string, string>[];
};