import { describe, it, expect } from 'vitest';
import { generateRowBasedEmailData, sortDataByMerchant } from '../utils/excel';

describe('Settlement Type - By Row', () => {
  // Test data with multiple merchants
  const testData = [
    { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 100 },
    { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 200 },
    { 商户名称: '商户B', 收件人邮箱: 'b@example.com', 金额: 150 },
    { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 50 },
    { 商户名称: '商户B', 收件人邮箱: 'b@example.com', 金额: 300 },
  ];

  it('should sort data by merchant name', () => {
    const sorted = sortDataByMerchant(testData, '商户名称');
    
    // Check that all 商户A entries come before 商户B entries
    let foundFirstB = false;
    for (const row of sorted) {
      if (row.商户名称 === '商户B') {
        foundFirstB = true;
      }
      if (foundFirstB && row.商户名称 === '商户A') {
        throw new Error('商户A should not appear after 商户B');
      }
    }
    
    expect(sorted.length).toBe(5);
  });

  it('should group data by merchant name', () => {
    const sorted = sortDataByMerchant(testData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    expect(Object.keys(grouped)).toContain('商户A');
    expect(Object.keys(grouped)).toContain('商户B');
    
    // Check 商户A has 4 records (3 data rows + 1 header row)
    expect(grouped['商户A'].length).toBe(4);
    
    // Check 商户B has 3 records (2 data rows + 1 header row)
    expect(grouped['商户B'].length).toBe(3);
  });

  it('should maintain data integrity in grouped records', () => {
    const sorted = sortDataByMerchant(testData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    // Verify 商户A records (first row is header, then data rows)
    const merchantARecords = grouped['商户A'];
    expect(merchantARecords[0]).toHaveProperty('商户名称'); // Header row
    expect(merchantARecords[1].金额).toBe(100);
    expect(merchantARecords[2].金额).toBe(200);
    expect(merchantARecords[3].金额).toBe(50);
    
    // Verify 商户B records (first row is header, then data rows)
    const merchantBRecords = grouped['商户B'];
    expect(merchantBRecords[0]).toHaveProperty('商户名称'); // Header row
    expect(merchantBRecords[1].金额).toBe(150);
    expect(merchantBRecords[2].金额).toBe(300);
  });

  it('should handle unsorted data correctly', () => {
    // Data is not sorted by merchant initially
    const unsortedData = [
      { 商户名称: '商户B', 收件人邮箱: 'b@example.com', 金额: 150 },
      { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 100 },
      { 商户名称: '商户B', 收件人邮箱: 'b@example.com', 金额: 300 },
      { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 200 },
    ];
    
    const sorted = sortDataByMerchant(unsortedData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    // After sorting and grouping, 商户A should have 3 records (2 data rows + 1 header row)
    expect(grouped['商户A'].length).toBe(3);
    expect(grouped['商户B'].length).toBe(3);
  });
});
