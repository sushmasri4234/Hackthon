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

  // 4. Solar PV Technician - Delhi NCR (10 Candidates)
  const solarDelhiWb = new ExcelJS.Workbook();
  const solarSheet = solarDelhiWb.addWorksheet('Candidates');
  solarSheet.addRow(headers);
  const solarData = [
    ['CAND-DEL-01', 'Arjun Verma', '9811223344', 'arjun.verma@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 92, '2024-10-28'],
    ['CAND-DEL-02', 'Simran Kaur', '9811223345', 'simran.k@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 88, '2024-10-28'],
    ['CAND-DEL-03', 'Mohit Rawat', '9811223346', 'mohit.r@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 76, '2024-10-28'],
    ['CAND-DEL-04', 'Pooja Aggarwal', '9811223347', 'pooja.a@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 95, '2024-10-28'],
    ['CAND-DEL-05', 'Tushar Sharma', '9811223348', 'tushar.s@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 81, '2024-10-28'],
    ['CAND-DEL-06', 'Megha Gupta', '9811223349', 'megha.g@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 89, '2024-10-28'],
    ['CAND-DEL-07', 'Harpreet Singh', '9811223350', 'harpreet.s@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 78, '2024-10-28'],
    ['CAND-DEL-08', 'Kunal Malhotra', '9811223351', 'kunal.m@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 93, '2024-10-28'],
    ['CAND-DEL-09', 'Nisha Yadav', '9811223352', 'nisha.y@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 84, '2024-10-28'],
    ['CAND-DEL-10', 'Deepak Bisht', '9811223353', 'deepak.b@solarskill.in', 'Solar PV Installer & Service Technician', 'Capital Skill Academy', 'New Delhi', 90, '2024-10-28'],
  ];
  solarData.forEach(row => solarSheet.addRow(row));
  await solarDelhiWb.xlsx.writeFile(path.join(SAMPLE_DIR, 'solar_technician_delhi_10_candidates.xlsx'));
  console.log('✓ Generated solar_technician_delhi_10_candidates.xlsx');

  // 5. Healthcare Assistant - Bengaluru Karnataka (15 Candidates)
  const healthBlrWb = new ExcelJS.Workbook();
  const healthSheet = healthBlrWb.addWorksheet('Candidates');
  healthSheet.addRow(headers);
  const healthData = [
    ['CAND-BLR-01', 'Kavya Ramesh', '9845112233', 'kavya.r@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 94, '2024-11-05'],
    ['CAND-BLR-02', 'Prashanth Gowda', '9845112234', 'prashanth.g@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 89, '2024-11-05'],
    ['CAND-BLR-03', 'Deepa Shetty', '9845112235', 'deepa.s@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 91, '2024-11-05'],
    ['CAND-BLR-04', 'Manoj Kumar', '9845112236', 'manoj.k@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 82, '2024-11-05'],
    ['CAND-BLR-05', 'Anitha Hegde', '9845112237', 'anitha.h@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 96, '2024-11-05'],
    ['CAND-BLR-06', 'Siddharth Rao', '9845112238', 'siddharth.r@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 78, '2024-11-05'],
    ['CAND-BLR-07', 'Rekha Murthy', '9845112239', 'rekha.m@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 87, '2024-11-05'],
    ['CAND-BLR-08', 'Kiran Varma', '9845112240', 'kiran.v@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 85, '2024-11-05'],
    ['CAND-BLR-09', 'Naveen Kumar', '9845112241', 'naveen.k@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 90, '2024-11-05'],
    ['CAND-BLR-10', 'Sowmya Bhat', '9845112242', 'sowmya.b@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 93, '2024-11-05'],
    ['CAND-BLR-11', 'Vinay Prasad', '9845112243', 'vinay.p@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 81, '2024-11-05'],
    ['CAND-BLR-12', 'Priyanka Reddy', '9845112244', 'priyanka.r@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 88, '2024-11-05'],
    ['CAND-BLR-13', 'Girish Naik', '9845112245', 'girish.n@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 75, '2024-11-05'],
    ['CAND-BLR-14', 'Shilpa Joshi', '9845112246', 'shilpa.j@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 92, '2024-11-05'],
    ['CAND-BLR-15', 'Harish Babu', '9845112247', 'harish.b@healthskill.org', 'General Duty Healthcare Assistant', 'Bengaluru Tech Skill Centre', 'Bengaluru Urban', 84, '2024-11-05'],
  ];
  healthData.forEach(row => healthSheet.addRow(row));
  await healthBlrWb.xlsx.writeFile(path.join(SAMPLE_DIR, 'healthcare_assistant_bengaluru_15_candidates.xlsx'));
  console.log('✓ Generated healthcare_assistant_bengaluru_15_candidates.xlsx');

  // 6. Data Analyst - Hyderabad Telangana (12 Candidates)
  const hydWb = new ExcelJS.Workbook();
  const hydSheet = hydWb.addWorksheet('Candidates');
  hydSheet.addRow(headers);
  const hydData = [
    ['CAND-HYD-01', 'Sai Teja', '9866112233', 'sai.t@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 91, '2024-11-10'],
    ['CAND-HYD-02', 'Sravani Reddy', '9866112234', 'sravani.r@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 95, '2024-11-10'],
    ['CAND-HYD-03', 'Akhil Varma', '9866112235', 'akhil.v@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 83, '2024-11-10'],
    ['CAND-HYD-04', 'Bhavana Chary', '9866112236', 'bhavana.c@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 89, '2024-11-10'],
    ['CAND-HYD-05', 'Karthik Raju', '9866112237', 'karthik.r@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 92, '2024-11-10'],
    ['CAND-HYD-06', 'Divya Sri', '9866112238', 'divya.s@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 87, '2024-11-10'],
    ['CAND-HYD-07', 'Venkatesh Babu', '9866112239', 'venkatesh.b@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 79, '2024-11-10'],
    ['CAND-HYD-08', 'Mounika Rao', '9866112240', 'mounika.r@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 94, '2024-11-10'],
    ['CAND-HYD-09', 'Rohith Krishna', '9866112241', 'rohith.k@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 86, '2024-11-10'],
    ['CAND-HYD-10', 'Swathi Kumari', '9866112242', 'swathi.k@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 90, '2024-11-10'],
    ['CAND-HYD-11', 'Naresh Goud', '9866112243', 'naresh.g@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 80, '2024-11-10'],
    ['CAND-HYD-12', 'Anusha Devi', '9866112244', 'anusha.d@techskill.org', 'Junior Data Analyst', 'HITEC Skilling Mission Centre', 'Hyderabad', 88, '2024-11-10'],
  ];
  hydData.forEach(row => hydSheet.addRow(row));
  await hydWb.xlsx.writeFile(path.join(SAMPLE_DIR, 'data_analyst_hyderabad_12_candidates.xlsx'));
  console.log('✓ Generated data_analyst_hyderabad_12_candidates.xlsx');

  // 7. EV Technician - Mumbai CSV Format (8 Candidates)
  const csvWb = new ExcelJS.Workbook();
  const csvSheet = csvWb.addWorksheet('Candidates');
  csvSheet.addRow(headers);
  const csvData = [
    ['CAND-MUM-01', 'Aditya Sawant', '9820112233', 'aditya.s@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 91, '2024-11-12'],
    ['CAND-MUM-02', 'Sneha Parab', '9820112234', 'sneha.p@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 87, '2024-11-12'],
    ['CAND-MUM-03', 'Pranav Kadam', '9820112235', 'pranav.k@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 82, '2024-11-12'],
    ['CAND-MUM-04', 'Tanvi Rane', '9820112236', 'tanvi.r@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 95, '2024-11-12'],
    ['CAND-MUM-05', 'Sanket Shinde', '9820112237', 'sanket.s@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 79, '2024-11-12'],
    ['CAND-MUM-06', 'Rashmi Patil', '9820112238', 'rashmi.p@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 90, '2024-11-12'],
    ['CAND-MUM-07', 'Omkar Jadhav', '9820112239', 'omkar.j@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 85, '2024-11-12'],
    ['CAND-MUM-08', 'Neha Chougule', '9820112240', 'neha.c@evskill.in', 'Electric Vehicle Service Technician', 'Mumbai Metro Skilling Hub', 'Mumbai City', 88, '2024-11-12'],
  ];
  csvData.forEach(row => csvSheet.addRow(row));
  await csvWb.csv.writeFile(path.join(SAMPLE_DIR, 'automotive_ev_technician_mumbai_8_candidates.csv'));
  await csvWb.xlsx.writeFile(path.join(SAMPLE_DIR, 'automotive_ev_technician_mumbai_8_candidates.xlsx'));
  console.log('✓ Generated automotive_ev_technician_mumbai_8_candidates.csv & .xlsx');

  // 8. Large Batch - 75 Candidates - Noida UP (Quality Team Review Trigger)
  const upLargeWb = new ExcelJS.Workbook();
  const upLargeSheet = upLargeWb.addWorksheet('Candidates');
  upLargeSheet.addRow(headers);
  for (let i = 1; i <= 75; i++) {
    const id = `CAND-NOIDA-${String(i).padStart(3, '0')}`;
    const name = `Scholar ${i} Technocrat`;
    const phone = `97${String(20000000 + i)}`;
    const email = `scholar${i}@noidaskill.edu`;
    const marks = 72 + (i % 26);
    upLargeSheet.addRow([id, name, phone, email, 'Embedded Systems & IoT Engineering', 'Noida IT & Electronics Skill Hub', 'Gautam Buddha Nagar (Noida)', marks, '2024-11-14']);
  }
  await upLargeWb.xlsx.writeFile(path.join(SAMPLE_DIR, 'mega_batch_75_candidates_noida.xlsx'));
  console.log('✓ Generated mega_batch_75_candidates_noida.xlsx (75 candidates)');
}

createSampleFiles().catch(console.error);
