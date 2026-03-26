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

  it('should group data by merchant name without header row', () => {
    const sorted = sortDataByMerchant(testData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    expect(Object.keys(grouped)).toContain('商户A');
    expect(Object.keys(grouped)).toContain('商户B');
    
    // Check 商户A has 3 data rows (no header row)
    expect(grouped['商户A'].length).toBe(3);
    
    // Check 商户B has 2 data rows (no header row)
    expect(grouped['商户B'].length).toBe(2);
  });

  it('should maintain data integrity in grouped records', () => {
    const sorted = sortDataByMerchant(testData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    // Verify 商户A records (all are data rows, no header)
    const merchantARecords = grouped['商户A'];
    expect(merchantARecords[0].商户名称).toBe('商户A');
    expect(merchantARecords[0].金额).toBe(100);
    expect(merchantARecords[1].金额).toBe(200);
    expect(merchantARecords[2].金额).toBe(50);
    
    // Verify 商户B records
    const merchantBRecords = grouped['商户B'];
    expect(merchantBRecords[0].商户名称).toBe('商户B');
    expect(merchantBRecords[0].金额).toBe(150);
    expect(merchantBRecords[1].金额).toBe(300);
  });

  it('should support custom classification column', () => {
    // Test with custom column name
    const customData = [
      { 部门: '销售部', 邮箱: 'sales@example.com', 金额: 1000 },
      { 部门: '销售部', 邮箱: 'sales@example.com', 金额: 2000 },
      { 部门: '技术部', 邮箱: 'tech@example.com', 金额: 1500 },
    ];
    
    const sorted = sortDataByMerchant(customData, '部门');
    const grouped = generateRowBasedEmailData(sorted, '部门');
    
    expect(Object.keys(grouped)).toContain('销售部');
    expect(Object.keys(grouped)).toContain('技术部');
    expect(grouped['销售部'].length).toBe(2);
    expect(grouped['技术部'].length).toBe(1);
  });

  it('should handle empty data', () => {
    const grouped = generateRowBasedEmailData([], '商户名称');
    expect(Object.keys(grouped).length).toBe(0);
  });

  it('should handle single merchant', () => {
    const singleMerchantData = [
      { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 100 },
      { 商户名称: '商户A', 收件人邮箱: 'a@example.com', 金额: 200 },
    ];
    
    const sorted = sortDataByMerchant(singleMerchantData, '商户名称');
    const grouped = generateRowBasedEmailData(sorted, '商户名称');
    
    expect(Object.keys(grouped).length).toBe(1);
    expect(grouped['商户A'].length).toBe(2);
  });
});
