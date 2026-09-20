import { describe, it, expect, beforeEach } from 'vitest';
import { auditService } from './auditService';
import { demoService } from './demoService';

describe('Task 2 - Service Layer & Audit Log', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 25000);

  it('should create and retrieve audit log rows', async () => {
    const entry = await auditService.log({
      actor_role: 'Administrator',
      actor_name: 'Test Admin',
      action: 'DATA_INGESTED',
      entity_type: 'INGESTION_BATCH',
      entity_id: 'batch-123',
      details: { department: 'Health', total_rows: 10 }
    });

    expect(entry).toBeDefined();
    expect(entry.action).toBe('DATA_INGESTED');
    expect(entry.actor_role).toBe('Administrator');

    const logs = await auditService.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    const found = logs.find(l => l.action === 'DATA_INGESTED');
    expect(found).toBeDefined();
    expect(found.details.department).toBe('Health');
  }, 25000);

  it('should reset demo data and log DEMO_RESET action', async () => {
    await auditService.log({
      actor_role: 'Officer',
      actor_name: 'Test Officer',
      action: 'AUTO_LINKED',
    });

    await demoService.resetDemoData();
    const logs = await auditService.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe('DEMO_RESET');
  }, 25000);
});
