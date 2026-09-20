import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestionService } from './ingestionService';
import { demoService } from './demoService';
import { parseDate } from '../lib/validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.join(__dirname, '../../public/sample-data');

describe('Task 3 — Admin Ingestion Pipeline', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 25000);

  it('should parse valid dates and reject invalid dates', () => {
    expect(parseDate('12/05/1980')).toBe('1980-05-12');
    expect(parseDate('1984-09-03')).toBe('1984-09-03');
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(() => parseDate('32/13/1990')).toThrow();
    expect(() => parseDate('invalid-date')).toThrow();
  });

  it('should import all five CSVs and stage source records', async () => {
    const files = [
      { name: 'health.csv', dept: 'Health' },
      { name: 'education.csv', dept: 'Education' },
      { name: 'food.csv', dept: 'Food & Civil Supplies' },
      { name: 'labour.csv', dept: 'Labour' },
      { name: 'housing.csv', dept: 'Housing' }
    ];

    let totalImported = 0;

    for (const f of files) {
      const csvText = fs.readFileSync(path.join(sampleDataDir, f.name), 'utf8');
      const result = await ingestionService.ingestCSV({
        csvText,
        department: f.dept,
        fileName: f.name
      });

      expect(result.batch).toBeDefined();
      expect(result.batch.department).toBe(f.dept);
      expect(result.batch.imported_rows).toBeGreaterThan(0);
      totalImported += result.batch.imported_rows;
    }

    expect(totalImported).toBeGreaterThan(95);

    const staged = await ingestionService.getSourceRecords();
    expect(staged.length).toBe(totalImported);

    // Verify source_* fields are preserved unmodified
    const heroHealth = staged.find(r => r.source_key === 'HLT-0001');
    expect(heroHealth).toBeDefined();
    expect(heroHealth.source_person_name).toBe('Rameshbhai Patel');
    expect(heroHealth.source_address).toBe('12 Shivam Society, Kalol');
    expect(heroHealth.district).toBe('Gandhinagar');
    expect(heroHealth.raw).toBeDefined();
    expect(heroHealth.raw.mobile).toBe('9825012345');
  }, 25000);

  it('should report bad rows with row numbers and not abort batch', async () => {
    const healthCSV = fs.readFileSync(path.join(sampleDataDir, 'health.csv'), 'utf8');
    const result = await ingestionService.ingestCSV({
      csvText: healthCSV,
      department: 'Health',
      fileName: 'health.csv'
    });

    expect(result.batch.error_rows).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    const dateError = result.errors.find(e => e.message.includes('Invalid date'));
    expect(dateError).toBeDefined();
    expect(dateError.rowNumber).toBeGreaterThan(1);
  }, 15000);

  it('should be idempotent: re-uploading file creates no duplicates', async () => {
    const housingCSV = fs.readFileSync(path.join(sampleDataDir, 'housing.csv'), 'utf8');

    // First upload
    const res1 = await ingestionService.ingestCSV({
      csvText: housingCSV,
      department: 'Housing',
      fileName: 'housing.csv'
    });

    const firstImportCount = res1.batch.imported_rows;
    expect(firstImportCount).toBeGreaterThan(0);

    // Second upload of same file
    const res2 = await ingestionService.ingestCSV({
      csvText: housingCSV,
      department: 'Housing',
      fileName: 'housing.csv'
    });

    expect(res2.batch.imported_rows).toBe(0);
    expect(res2.batch.duplicates_in_file).toBe(firstImportCount);
  }, 15000);

  it('should detect in-file duplicates (e.g. HLT-0007 in health.csv)', async () => {
    const healthCSV = fs.readFileSync(path.join(sampleDataDir, 'health.csv'), 'utf8');
    const res = await ingestionService.ingestCSV({
      csvText: healthCSV,
      department: 'Health',
      fileName: 'health.csv'
    });

    expect(res.batch.duplicates_in_file).toBeGreaterThanOrEqual(1);
  }, 15000);
});
