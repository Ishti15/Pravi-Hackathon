import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';

export const demoService = {
  /**
   * Reset all synthetic demo data
   */
  async resetDemoData(actorRole = 'Administrator', actorName = 'Admin User') {
    if (isSupabaseConfigured) {
      try {
        await supabase.rpc('reset_demo_data');
      } catch (err) {
        console.warn('Supabase reset RPC error:', err.message);
      }

      try {
        await supabase.from('audit_log').delete().neq('action', '__NEVER__');
        await supabase.from('document').delete().neq('doc_type', '__NEVER__');
        await supabase.from('identity_verification').delete().neq('consent_status', '__NEVER__');
        await supabase.from('change_request').delete().neq('status', '__NEVER__');
        await supabase.from('data_conflict').delete().neq('status', '__NEVER__');
        await supabase.from('enrollment').delete().neq('status', '__NEVER__');
        await supabase.from('application').delete().neq('status', '__NEVER__');
        await supabase.from('eligibility_result').delete().neq('status', '__NEVER__');
        await supabase.from('family_member').delete().neq('status', '__NEVER__');
        await supabase.from('family').delete().neq('family_status', '__NEVER__');
        await supabase.from('match_review').delete().neq('status', '__NEVER__');
        await supabase.from('source_record').delete().neq('department', '__NEVER__');
        await supabase.from('ingestion_batch').delete().neq('department', '__NEVER__');
        await supabase.from('person').delete().neq('canonical_name', '__NEVER__');
      } catch (err) {
        console.warn('Direct cleanup fallback failed:', err.message);
      }
    }

    memoryStore.reset();

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'DEMO_RESET',
      entity_type: 'SYSTEM',
      details: { timestamp: new Date().toISOString() }
    });

    return { success: true, message: 'Demo data reset successfully.' };
  }
};
