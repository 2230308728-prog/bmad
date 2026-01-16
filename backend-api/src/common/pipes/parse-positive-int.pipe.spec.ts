import { ParsePositiveIntPipe } from './parse-positive-int.pipe';
import { ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

describe('ParsePositiveIntPipe', () => {
  let pipe: ParsePositiveIntPipe;
  const metadata: ArgumentMetadata = {
    type: 'custom',
    metatype: Number,
    data: 'id',
  };

  beforeEach(() => {
    pipe = new ParsePositiveIntPipe();
  });

  describe('transform', () => {
    it('should accept valid positive integers', () => {
      expect(pipe.transform('1', metadata)).toBe(1);
      expect(pipe.transform('42', metadata)).toBe(42);
      expect(pipe.transform('9999', metadata)).toBe(9999);
    });

    it('should reject zero', () => {
      expect(() => pipe.transform('0', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('0', metadata)).toThrow(
        'Validation failed: "0" must be a positive integer',
      );
    });

    it('should reject negative integers', () => {
      expect(() => pipe.transform('-1', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('-100', metadata)).toThrow(
        BadRequestException,
      );
      // 负号会在格式检查时被拒绝
      expect(() => pipe.transform('-1', metadata)).toThrow(
        'Validation failed: "-1" is not a valid integer',
      );
    });

    it('should reject NaN values', () => {
      expect(() => pipe.transform('abc', metadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform('not-a-number', metadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform('abc', metadata)).toThrow(
        'Validation failed: "abc" is not a valid integer',
      );
    });

    it('should reject decimal numbers', () => {
      expect(() => pipe.transform('1.5', metadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform('3.14', metadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform('3.14', metadata)).toThrow(
        'Validation failed: "3.14" is not a valid integer',
      );
    });

    it('should reject empty string', () => {
      expect(() => pipe.transform('', metadata)).toThrow(BadRequestException);
    });

    it('should reject special characters', () => {
      expect(() => pipe.transform('!@#', metadata)).toThrow(
        BadRequestException,
      );
    });

    it('should handle edge cases', () => {
      // Very large number
      expect(pipe.transform('2147483647', metadata)).toBe(2147483647);

      // Number with leading zeros
      expect(pipe.transform('001', metadata)).toBe(1);
    });
  });
});
