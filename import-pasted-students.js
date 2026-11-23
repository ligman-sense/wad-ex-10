require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const Student = require('./models/Student');

function parseTsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === '\t' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(field.trim()); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      if (char === '\r' && text[i + 1] === '\n') i += 1;
    } else field += char;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  if (quoted) throw new Error('The pasted text ends inside a quoted field.');
  return rows;
}

function mapRow(row, rowNumber) {
  if (row.length !== 14) throw new Error(`Row ${rowNumber} has ${row.length} columns; expected 14.`);
  const code = row[0].trim();
  const digits = code.replace(/\D/g, '');
  const yearMatch = row[3].match(/(\d{4})/);
  const student = {
    // Preserve the 26 cohort prefix in numeric form (26MX101 becomes rollno 26101).
    rollno: Number(digits),
    name: row[1].trim(),
    yearOfBirth: yearMatch ? Number(yearMatch[1]) : NaN,
    yearOfAdmission: /^26/i.test(code) ? 2026 : NaN,
    nativeCity: row[5].trim(),
    phoneNumber: row[10].trim(),
    gender: row[11].trim()
  };
  if (!student.rollno || !student.name || !Number.isInteger(student.yearOfBirth) || !Number.isInteger(student.yearOfAdmission) || !student.nativeCity || !/^\d{10}$/.test(student.phoneNumber) || !['Male', 'Female', 'Other'].includes(student.gender)) {
    throw new Error(`Row ${rowNumber} is missing or has an invalid app-required field.`);
  }
  return student;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filePath = args.find(arg => arg !== '--dry-run');
  if (!filePath) throw new Error('Usage: node import-pasted-students.js "path to Pasted text.txt" [--dry-run]');
  const rows = parseTsv(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  const students = rows.map((row, index) => mapRow(row, index + 1));
  const rollnos = students.map(student => student.rollno);
  if (new Set(rollnos).size !== rollnos.length) throw new Error('Duplicate roll numbers found in the source file. No records were inserted.');
  for (const student of students) await new Student(student).validate();
  if (dryRun) {
    console.log(`Validated ${students.length} student records; no database writes were made.`);
    return;
  }

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/StudentDB');
  const alreadyPresent = await Student.find({ rollno: { $in: rollnos } }, { rollno: 1 }).lean();
  const present = new Set(alreadyPresent.map(student => student.rollno));
  for (const student of students) {
    await Student.updateOne({ rollno: student.rollno }, { $setOnInsert: student }, { upsert: true, runValidators: true });
  }
  console.log(`Imported ${students.length - present.size} new student records; skipped ${present.size} existing roll numbers.`);
}

main()
  .catch(err => { console.error(`Import stopped: ${err.message}`); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });

