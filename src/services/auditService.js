import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';

export const auditService = {
  /**
   * Log an action into the audit trail.
   * @param {Object} params
   * @param {string} params.actor_role - Citizen / Officer / Administrator / System
   * @param {string} params.actor_name - Name of actor
   * @param {string} params.action - Action constant (e.g. DATA_INGESTED, AUTO_LINKED, etc.)
   * @param {string} [params.entity_type] - Target entity type (e.g. PERSON, FAMILY, APPLICATION)
   * @param {string} [params.entity_id] - Target entity ID
   * @param {Object} [params.details] - Additional JSON metadata
   */
  async log({ actor_role, actor_name, action, entity_type = null, entity_id = null, details = {} }) {
    const entry = {
      audit_id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor_role,
      actor_name,
      action,
      entity_type,
      entity_id,
      details
    };

    memoryStore.auditLogs.unshift(entry);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .insert([{
            audit_id: entry.audit_id,
            at: entry.at,
            actor_role,
            actor_name,
            action,
            entity_type,
            entity_id,
            details
          }])
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Audit Supabase insert failed, using memoryStore:', err.message);
      }
    }

    return entry;
  },

  /**
   * Retrieve audit logs
   */
  async getLogs(limit = 100) {
    const map = new Map();
    memoryStore.auditLogs.forEach(l => map.set(l.audit_id, l));

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('audit_log')
          .select('*')
          .order('at', { ascending: false })
          .limit(limit);

        if (memoryStore.lastResetAt) {
          query = query.gte('at', memoryStore.lastResetAt);
        }

        const { data, error } = await query;

        if (!error && data) {
          data.forEach(l => map.set(l.audit_id, l));
        }
      } catch (err) {
        console.warn('Audit Supabase fetch failed, falling back to memoryStore:', err.message);
      }
    }

    let all = Array.from(map.values());
    if (memoryStore.lastResetAt) {
      all = all.filter(l => new Date(l.at) >= new Date(memoryStore.lastResetAt) || l.action === 'DEMO_RESET');
    }

    return all.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
  }
};
