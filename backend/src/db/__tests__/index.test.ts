import { normalizeStudentId, normalizeUserName, normalizeProjectCode } from '../index';

describe('Database Utility Functions', () => {
  describe('normalizeStudentId', () => {
    it('should remove all whitespace from student ID', () => {
      expect(normalizeStudentId('AB 1234')).toBe('AB1234');
      expect(normalizeStudentId('AB  12  34')).toBe('AB1234');
      expect(normalizeStudentId('  AB1234  ')).toBe('AB1234');
    });

    it('should convert to uppercase', () => {
      expect(normalizeStudentId('ab1234')).toBe('AB1234');
      expect(normalizeStudentId('Ab1234')).toBe('AB1234');
    });

    it('should handle empty strings', () => {
      expect(normalizeStudentId('')).toBe('');
      expect(normalizeStudentId('   ')).toBe('');
    });

    it('should handle IDs with tabs and newlines', () => {
      expect(normalizeStudentId('AB\t1234\n')).toBe('AB1234');
    });
  });

  describe('normalizeUserName', () => {
    it('should trim and convert to lowercase', () => {
      expect(normalizeUserName('John Doe')).toBe('john doe');
      expect(normalizeUserName('  Jane Smith  ')).toBe('jane smith');
    });

    it('should handle empty strings', () => {
      expect(normalizeUserName('')).toBe('');
      expect(normalizeUserName('   ')).toBe('');
    });

    it('should preserve internal spaces', () => {
      expect(normalizeUserName('Mary Jane Watson')).toBe('mary jane watson');
    });
  });

  describe('normalizeProjectCode', () => {
    it('should trim and convert to uppercase', () => {
      expect(normalizeProjectCode('abc123')).toBe('ABC123');
      expect(normalizeProjectCode('  xyz456  ')).toBe('XYZ456');
    });

    it('should handle empty strings', () => {
      expect(normalizeProjectCode('')).toBe('');
      expect(normalizeProjectCode('   ')).toBe('');
    });

    it('should handle mixed case', () => {
      expect(normalizeProjectCode('TeSt99')).toBe('TEST99');
    });
  });
});
