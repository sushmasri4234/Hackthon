import ExcelJS from 'exceljs';
import { z } from 'zod';

export interface CandidateRow {
  candidateExtId: string;
  fullName: string;
  phone: string;
  email?: string;
  courseName: string;
  trainingCentre: string;
  district: string;
  marks: number;
  completionDate: Date;
  rowNumber: number;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string | number | undefined;
  error: string;
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  candidates: CandidateRow[];
  errors: ValidationError[];
}

// Column name mappings (case-insensitive, common variants)
const COLUMN_ALIASES: Record<string, string[]> = {
  candidateExtId: ['candidate id', 'candidateid', 'id', 'candidate_id', 'reg no', 'regno'],
  fullName: ['full name', 'name', 'fullname', 'candidate name', 'student name'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'contact', 'phone_number'],
  email: ['email', 'email address', 'e-mail'],
  courseName: ['course', 'course name', 'coursename', 'program', 'programme'],
  trainingCentre: ['training centre', 'training center', 'centre', 'center', 'institute'],
  district: ['district', 'dist'],
  marks: ['marks', 'score', 'assessment score', 'result', 'percentage'],
  completionDate: ['completion date', 'completiondate', 'date of completion', 'end date', 'pass date'],
};

const phoneRegex = /^[6-9]\d{9}$/;

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumnIndex(headers: string[], field: string): number {
  const aliases = COLUMN_ALIASES[field] || [field.toLowerCase()];
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (aliases.includes(h)) return i;
  }
  return -1;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
    // Try DD/MM/YYYY
    const parts = value.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

export async function validateExcelUpload(buffer: Buffer): Promise<ValidationResult> {
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.load(buffer as any);
  } catch {
    try {
      const { Readable } = await import('stream');
      await workbook.csv.read(Readable.from(buffer));
    } catch {
      return {
        valid: false,
        candidates: [],
        errors: [{
          row: 0,
          field: 'file',
          value: undefined,
          error: 'Cannot read file. Ensure it is a valid .xlsx or .csv file.',
          suggestion: 'Save the file as Excel Workbook (.xlsx) or CSV (.csv) format and re-upload.',
        }],
      };
    }
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      valid: false,
      candidates: [],
      errors: [{
        row: 0,
        field: 'file',
        value: undefined,
        error: 'Excel file has no worksheets.',
        suggestion: 'Ensure the file has at least one sheet with data.',
      }],
    };
  }

  const rows = worksheet.getRows(1, worksheet.rowCount) || [];
  if (rows.length < 2) {
    return {
      valid: false,
      candidates: [],
      errors: [{
        row: 0,
        field: 'file',
        value: undefined,
        error: 'File is empty or has only headers.',
        suggestion: 'Add at least one candidate row below the header row.',
      }],
    };
  }

  // Parse headers from first row
  const headerRow = rows[0];
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    headers.push(String(cell.value || ''));
  });

  // Find column indices
  const colIdx: Record<string, number> = {};
  const mandatoryFields = ['candidateExtId', 'fullName', 'phone', 'courseName', 'trainingCentre', 'district', 'marks', 'completionDate'];
  const missingHeaders: string[] = [];

  for (const field of mandatoryFields) {
    const idx = findColumnIndex(headers, field);
    if (idx === -1) {
      missingHeaders.push(COLUMN_ALIASES[field]?.[0] || field);
    } else {
      colIdx[field] = idx;
    }
  }
  colIdx['email'] = findColumnIndex(headers, 'email');

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      candidates: [],
      errors: missingHeaders.map((h) => ({
        row: 1,
        field: h,
        value: undefined,
        error: `Required column "${h}" not found in spreadsheet.`,
        suggestion: `Add a column named "${h}" to the spreadsheet header row.`,
      })),
    };
  }

  const errors: ValidationError[] = [];
  const candidates: CandidateRow[] = [];
  const seenIds = new Set<string>();
  const seenPhones = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed, row 1 is header

    // Skip truly empty rows
    let hasData = false;
    row.eachCell({ includeEmpty: false }, () => { hasData = true; });
    if (!hasData) continue;

    function getCell(field: string): string {
      const idx = colIdx[field];
      if (idx === undefined || idx === -1) return '';
      const cell = row.getCell(idx + 1); // ExcelJS is 1-indexed
      return String(cell.value ?? '').trim();
    }

    const candidateExtId = getCell('candidateExtId');
    const fullName = getCell('fullName');
    const phone = getCell('phone');
    const email = colIdx['email'] !== -1 ? getCell('email') : undefined;
    const courseName = getCell('courseName');
    const trainingCentre = getCell('trainingCentre');
    const district = getCell('district');
    const marksStr = getCell('marks');
    const completionDateStr = getCell('completionDate');

    // Validate each field
    if (!candidateExtId) {
      errors.push({ row: rowNum, field: 'Candidate ID', value: candidateExtId, error: 'Candidate ID is missing.', suggestion: 'Enter a unique candidate ID for this row.' });
    } else if (seenIds.has(candidateExtId)) {
      errors.push({ row: rowNum, field: 'Candidate ID', value: candidateExtId, error: `Duplicate Candidate ID: "${candidateExtId}" already exists in this file.`, suggestion: 'Ensure each candidate has a unique ID.' });
    } else {
      seenIds.add(candidateExtId);
    }

    if (!fullName) {
      errors.push({ row: rowNum, field: 'Full Name', value: fullName, error: 'Candidate name is missing.', suggestion: 'Enter the full name of the candidate.' });
    } else if (fullName.length < 2) {
      errors.push({ row: rowNum, field: 'Full Name', value: fullName, error: 'Name is too short.', suggestion: 'Enter the complete full name.' });
    }

    const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
    if (!phone) {
      errors.push({ row: rowNum, field: 'Phone', value: phone, error: 'Phone number is missing.', suggestion: 'Enter a 10-digit Indian mobile number starting with 6-9.' });
    } else if (!phoneRegex.test(phoneClean)) {
      errors.push({ row: rowNum, field: 'Phone', value: phone, error: `Invalid phone number: "${phone}". Must be a 10-digit number starting with 6, 7, 8, or 9.`, suggestion: 'Enter a valid 10-digit Indian mobile number, e.g., 9876543210.' });
    }

    if (!courseName) {
      errors.push({ row: rowNum, field: 'Course Name', value: courseName, error: 'Course name is missing.', suggestion: 'Enter the name of the course/skill programme.' });
    }

    if (!trainingCentre) {
      errors.push({ row: rowNum, field: 'Training Centre', value: trainingCentre, error: 'Training centre name is missing.', suggestion: 'Enter the name of the training centre.' });
    }

    if (!district) {
      errors.push({ row: rowNum, field: 'District', value: district, error: 'District is missing.', suggestion: 'Enter the district name.' });
    }

    const marks = parseFloat(marksStr);
    if (!marksStr) {
      errors.push({ row: rowNum, field: 'Marks', value: marksStr, error: 'Marks/score is missing.', suggestion: 'Enter the assessment marks (0-100).' });
    } else if (isNaN(marks) || marks < 0 || marks > 100) {
      errors.push({ row: rowNum, field: 'Marks', value: marksStr, error: `Invalid marks: "${marksStr}". Must be a number between 0 and 100.`, suggestion: 'Enter a numeric value between 0 and 100.' });
    }

    // Get the raw cell value for date
    const idx = colIdx['completionDate'];
    const dateCell = idx !== undefined ? row.getCell(idx + 1) : null;
    const completionDate = dateCell ? parseDate(dateCell.value) : null;
    if (!completionDateStr && !completionDate) {
      errors.push({ row: rowNum, field: 'Completion Date', value: completionDateStr, error: 'Completion date is missing.', suggestion: 'Enter the course completion date in DD/MM/YYYY format.' });
    } else if (!completionDate) {
      errors.push({ row: rowNum, field: 'Completion Date', value: completionDateStr, error: `Invalid date: "${completionDateStr}".`, suggestion: 'Enter date in DD/MM/YYYY or YYYY-MM-DD format.' });
    } else if (completionDate > new Date()) {
      errors.push({ row: rowNum, field: 'Completion Date', value: completionDateStr, error: 'Completion date cannot be in the future.', suggestion: 'Enter the actual course completion date, which must be in the past.' });
    }

    // Email validation if provided
    if (email && email.length > 0) {
      const emailResult = z.string().email().safeParse(email);
      if (!emailResult.success) {
        errors.push({ row: rowNum, field: 'Email', value: email, error: `Invalid email address: "${email}".`, suggestion: 'Enter a valid email address or leave the field blank.' });
      }
    }

    // If this row had no errors (up to now for this candidate), add to valid list
    const rowHasError = errors.some((e) => e.row === rowNum);
    if (!rowHasError && completionDate) {
      candidates.push({
        candidateExtId,
        fullName,
        phone: phoneClean,
        email: email || undefined,
        courseName,
        trainingCentre,
        district,
        marks,
        completionDate,
        rowNumber: rowNum,
      });
    }
  }

  return {
    valid: errors.length === 0,
    candidates,
    errors,
  };
}
