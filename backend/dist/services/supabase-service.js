"use strict";
// Supabase service for managing alerts
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAlertToSupabase = saveAlertToSupabase;
exports.updateAlertStatus = updateAlertStatus;
const supabase_js_1 = require("../config/supabase.js");
/**
 * Saves an alert from Zabbix webhook to Supabase
 * @param tenantId The tenant ID associated with this alert
 * @param payload The webhook payload from Zabbix
 */
async function saveAlertToSupabase(tenantId, payload) {
    if (!(0, supabase_js_1.isSupabaseConfigured)()) {
        console.warn('[Supabase Service] Supabase is not configured. Skipping alert save.');
        return { success: false, error: 'Supabase not configured' };
    }
    try {
        // Parse the payload - handle both new and legacy formats
        const eventId = payload.eventid || `legacy-${Date.now()}`;
        const alertName = payload.name || payload.alert_name || 'Unknown Alert';
        const hostName = payload.hostname || payload.host || 'Unknown Host';
        const hostGroups = payload.hostgroups || payload.host_groups || '';
        // Parse clock - can be "YYYY.MM.DD HH:MM:SS" or timestamp
        let clockDate;
        if (payload.clock) {
            // Try parsing Zabbix date format
            const clockStr = payload.clock.replace(/\./g, '-');
            clockDate = new Date(clockStr);
            if (isNaN(clockDate.getTime())) {
                clockDate = new Date();
            }
        }
        else {
            clockDate = new Date();
        }
        const alertRecord = {
            tenant_id: tenantId,
            event_id: eventId,
            name: alertName,
            severity: payload.severity || '0',
            status: payload.status || 'PROBLEM',
            clock: clockDate,
            acknowledged: payload.acknowledged === 'Yes' || payload.acknowledged === '1',
            host_id: payload.hostid || null,
            host_name: hostName,
            host_ip: payload.hostip || null,
            host_groups: hostGroups.split(',').map(g => g.trim()).filter(Boolean),
            trigger_id: payload.triggerid || null,
            raw_payload: payload,
        };
        console.log(`[Supabase Service] Saving alert ${eventId} for tenant ${tenantId}`);
        const { data, error } = await supabase_js_1.supabase
            .from('alerts')
            .upsert(alertRecord, {
            onConflict: 'tenant_id,event_id',
            ignoreDuplicates: false
        })
            .select();
        if (error) {
            console.error('[Supabase Service] Error saving alert:', error);
            return { success: false, error: error.message };
        }
        console.log(`[Supabase Service] Alert saved successfully:`, data);
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Supabase Service] Exception saving alert:', message);
        return { success: false, error: message };
    }
}
/**
 * Updates an alert status (e.g., when resolved)
 */
async function updateAlertStatus(tenantId, eventId, status) {
    if (!(0, supabase_js_1.isSupabaseConfigured)()) {
        return { success: false, error: 'Supabase not configured' };
    }
    try {
        const updateData = { status };
        if (status === 'RESOLVED') {
            updateData.resolved_at = new Date().toISOString();
        }
        const { error } = await supabase_js_1.supabase
            .from('alerts')
            .update(updateData)
            .eq('tenant_id', tenantId)
            .eq('event_id', eventId);
        if (error) {
            console.error('[Supabase Service] Error updating alert:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}
