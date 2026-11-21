import ExcelJS from 'exceljs';
import path from 'path';

const SAMPLE_DIR = path.resolve(__dirname, '../../../sample_data');

async function createSampleFiles() {
  const headers = [
    'Candidate ID', 'Full Name', 'Phone', 'Email',
    'Course Name', 'Training Centre', 'District', 'Marks', 'Completion Date'
  ];

  // 1. Valid Batch (5 Candidates)
  const validWorkbook = new ExcelJS.Workbook();
  const validSheet = validWorkbook.addWorksheet('Candidates');
  validSheet.addRow(headers);
  const validData = [
    ['CAND-101', 'Aarav Sharma', '9876543210', 'aarav@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 88, '2024-10-15'],
    ['CAND-102', 'Diya Patel', '9876543211', 'diya@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 94, '2024-10-15'],
    ['CAND-103', 'Rohan Kulkarni', '9876543212', 'rohan@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 79, '2024-10-15'],
    ['CAND-104', 'Ananya Deshmukh', '9876543213', 'ananya@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 91, '2024-10-15'],
    ['CAND-105', 'Vikram Joshi', '9876543214', 'vikram@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 85, '2024-10-15'],
  ];
  validData.forEach(row => validSheet.addRow(row));
  await validWorkbook.xlsx.writeFile(path.join(SAMPLE_DIR, 'valid_candidates_batch.xlsx'));
  console.log('✓ Generated valid_candidates_batch.xlsx');

  // 2. Invalid Batch (With errors for Demo Test 1)
  const invalidWorkbook = new ExcelJS.Workbook();
  const invalidSheet = invalidWorkbook.addWorksheet('Candidates');
  invalidSheet.addRow(headers);
  const invalidData = [
    ['CAND-201', 'Suresh Raina', '9876543210', 'suresh@example.com', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 85, '2024-10-15'],
    ['', 'Missing ID Candidate', '9876543211', '', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 80, '2024-10-15'], // Missing ID
    ['CAND-203', '', '9876543212', '', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 75, '2024-10-15'], // Missing Name
    ['CAND-204', 'Invalid Phone Candidate', '12345', '', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 70, '2024-10-15'], // Invalid phone
    ['CAND-201', 'Duplicate ID Candidate', '9876543214', '', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 82, '2024-10-15'], // Duplicate CAND-201
    ['CAND-206', 'High Marks Candidate', '9876543215', '', 'Basic Computer Skills', 'Pune Skill Development Centre', 'Pune', 150, '2024-10-15'], // Marks > 100
  ];
  invalidData.forEach(row => invalidSheet.addRow(row));
  await invalidWorkbook.xlsx.writeFile(path.join(SAMPLE_DIR, 'invalid_candidates_batch.xlsx'));
  console.log('✓ Generated invalid_candidates_batch.xlsx');

  // 3. Large Batch (60 Candidates for Demo Test 3 & Quality Scrutiny)
  const largeWorkbook = new ExcelJS.Workbook();
  const largeSheet = largeWorkbook.addWorksheet('Candidates');
  largeSheet.addRow(headers);
  for (let i = 1; i <= 60; i++) {
    const id = `CAND-LARGE-${String(i).padStart(3, '0')}`;
    const name = `Candidate ${i} Pride`;
    const phone = `98${String(10000000 + i)}`;
    const email = `cand${i}@pragati.org`;
    const marks = 70 + (i % 25);
    largeSheet.addRow([id, name, phone, email, 'Advanced IT & Cloud Skills', 'Pune Skill Development Centre', 'Pune', marks, '2024-11-01']);
  }
  await largeWorkbook.xlsx.writeFile(path.join(SAMPLE_DIR, 'large_batch_60_candidates.xlsx'));
  console.log('✓ Generated large_batch_60_candidates.xlsx (60 candidates)');
}

createSampleFiles().catch(console.error);
