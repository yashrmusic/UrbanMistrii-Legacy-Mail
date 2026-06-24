const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xcbpmntovmzdjbphivzt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XsE5hKxS3XCTgpYIY2Cdkg_376eKe7h';

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);
}

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

async function verifySession(token) {
  if (!token) return null;
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function auditLog(supabase, entry) {
  try {
    await supabase.from('recruitment_audit_logs').insert(entry);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

async function logEmail(supabase, entry) {
  try {
    const { data } = await supabase.from('email_logs').insert(entry).select('id').single();
    return data?.id || null;
  } catch (e) {
    console.error('Email log error:', e);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await verifySession(req.headers.authorization?.replace('Bearer ', ''));
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const supabase = createAdminClient();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/admin-recruitment/, '') || '/';
  const searchParams = url.searchParams;

  const auditBase = {
    performed_by: user.id,
    performed_by_email: user.email,
    ip_address: getClientIP(req),
  };

  try {
    if (req.method === 'GET' && (path === '/' || path === '')) {
      let query = supabase
        .from('candidates')
        .select('*')
        .order('application_date', { ascending: false });

      const status = searchParams.get('status');
      const position = searchParams.get('position');
      const archived = searchParams.get('archived');
      const search = searchParams.get('search');

      if (status) {
        const statuses = status.split(',');
        query = query.in('status', statuses);
      }
      if (position) query = query.eq('position', position);
      if (archived === 'true') query = query.eq('archived', true);
      else if (archived !== 'all') query = query.eq('archived', false);
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.json({ ok: true, candidates: data });
    }

    if (req.method === 'GET' && path === '/stats') {
      const countByStatus = async (statuses, archived = false) => {
        let q = supabase.from('candidates').select('*', { count: 'exact', head: true }).in('status', statuses);
        if (!archived) q = q.eq('archived', false);
        const { count } = await q;
        return count || 0;
      };

      const stats = {
        attention: await countByStatus(['Applied', 'Reviewing', 'Assignment Submitted']),
        interviews: await countByStatus(['Interview Scheduled']),
        tests: await countByStatus(['Assignment Submitted']),
        offers: await countByStatus(['Offer Extended']),
      };

      return res.json({ ok: true, stats });
    }

    if (req.method === 'GET' && path === '/templates') {
      const { data, error } = await supabase.from('email_templates').select('*').order('template_key');
      if (error) throw error;
      return res.json({ ok: true, templates: data });
    }

    if (req.method === 'PATCH' && (path === '/' || path === '')) {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });

      const allowedFields = ['status', 'public_status', 'public_status_message', 'internal_notes'];
      const cleanUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) cleanUpdates[field] = updates[field];
      }

      const { data: oldData, error: fetchError } = await supabase.from('candidates').select('status, public_status, internal_notes').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase.from('candidates').update(cleanUpdates).eq('id', id).select().single();
      if (error) throw error;

      for (const field of Object.keys(cleanUpdates)) {
        const oldVal = oldData?.[field] || null;
        const newVal = cleanUpdates[field];
        if (oldVal !== newVal) {
          auditLog(supabase, {
            ...auditBase,
            candidate_id: id,
            application_id: data.application_id,
            action: 'update',
            field,
            old_value: String(oldVal || ''),
            new_value: String(newVal || ''),
          });
        }
      }

      return res.json({ ok: true, candidate: data });
    }

    if (req.method === 'PATCH' && path === '/templates') {
      const { id, subject, body } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });

      const updates = {};
      if (subject) updates.subject = subject;
      if (body) updates.body = body;

      const { error } = await supabase.from('email_templates').update(updates).eq('id', id);
      if (error) throw error;

      auditLog(supabase, {
        ...auditBase,
        action: 'template_update',
        field: 'email_templates',
        metadata: { templateId: id, updatedFields: Object.keys(updates) },
      });

      return res.json({ ok: true });
    }

    if (req.method === 'GET' && path === '/holidays') {
      const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: false });
      if (error) throw error;
      return res.json({ ok: true, holidays: data });
    }

    if (req.method === 'POST' && path === '/holidays') {
      const { date, name, type } = req.body || {};
      if (!date || !name) return res.status(400).json({ ok: false, error: 'date and name required' });
      const { data, error } = await supabase.from('holidays').insert({ date, name, type: type || 'public_holiday', created_by: user.email }).select().single();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ ok: false, error: 'Holiday already exists for this date' });
        throw error;
      }

      auditLog(supabase, {
        ...auditBase,
        action: 'holiday_create',
        field: 'holidays',
        new_value: `${date}: ${name}`,
      });

      return res.json({ ok: true, holiday: data });
    }

    if (req.method === 'DELETE' && path === '/holidays') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });

      const { data: oldData } = await supabase.from('holidays').select('date, name').eq('id', id).single();

      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;

      auditLog(supabase, {
        ...auditBase,
        action: 'holiday_delete',
        field: 'holidays',
        old_value: oldData ? `${oldData.date}: ${oldData.name}` : id,
      });

      return res.json({ ok: true });
    }

    if (req.method === 'GET' && path === '/overrides') {
      const { data, error } = await supabase.from('day_overrides').select('*').order('date', { ascending: false });
      if (error) throw error;
      return res.json({ ok: true, overrides: data });
    }

    if (req.method === 'POST' && path === '/overrides') {
      const { date, status, reason } = req.body || {};
      if (!date || !status) return res.status(400).json({ ok: false, error: 'date and status required' });
      if (!['closed', 'open', 'half_day'].includes(status)) return res.status(400).json({ ok: false, error: 'status must be closed, open, or half_day' });
      const { data, error } = await supabase.from('day_overrides').upsert(
        { date, status, reason: reason || null, updated_by: user.email },
        { onConflict: 'date' }
      ).select().single();
      if (error) throw error;

      auditLog(supabase, {
        ...auditBase,
        action: 'override_upsert',
        field: 'day_overrides',
        new_value: `${date}: ${status}`,
        metadata: { reason },
      });

      return res.json({ ok: true, override: data });
    }

    if (req.method === 'DELETE' && path === '/overrides') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });

      const { data: oldData } = await supabase.from('day_overrides').select('date, status').eq('id', id).single();

      const { error } = await supabase.from('day_overrides').delete().eq('id', id);
      if (error) throw error;

      auditLog(supabase, {
        ...auditBase,
        action: 'override_delete',
        field: 'day_overrides',
        old_value: oldData ? `${oldData.date}: ${oldData.status}` : id,
      });

      return res.json({ ok: true });
    }

    if (req.method === 'POST' && path === '/actions') {
      const { candidateId, action, emailVars } = req.body || {};
      if (!candidateId || !action) {
        return res.status(400).json({ ok: false, error: 'candidateId and action required' });
      }

      const actions = {
        review: { status: 'Reviewing', public_status: 'Reviewing', public_status_message: 'Your application is currently being reviewed by our team.', email_template: null },
        send_test: { status: 'Assignment Sent', public_status: 'Assignment Sent', public_status_message: 'A design assignment has been sent to you. Please check your email.', email_template: 'assignment_sent' },
        schedule_interview: { status: 'Interview Scheduled', public_status: 'Interview Scheduled', public_status_message: 'Your interview has been scheduled. Please check your email for details.', email_template: 'interview_scheduled' },
        extend_offer: { status: 'Offer Extended', public_status: 'Offer Extended', public_status_message: 'We are pleased to inform you that an offer has been extended. Please check your email.', email_template: 'offer_extended', archive: false },
        reject: { status: 'Rejected', public_status: 'Rejected', public_status_message: 'Thank you for your interest. We have decided to move forward with other candidates at this time.', email_template: 'rejected', archive: true },
        talent_pool: { status: 'Talent Pool', public_status: 'Talent Pool', public_status_message: 'Your profile has been added to our talent pool for future opportunities.', email_template: 'talent_pool', archive: true },
        hire: { status: 'Hired', public_status: 'Hired', public_status_message: 'Welcome to Urban Mistrii Studio! We look forward to having you on the team.', email_template: 'welcome_onboard', archive: true, hired: true },
      };

      const actionConfig = actions[action];
      if (!actionConfig) return res.status(400).json({ ok: false, error: 'Invalid action' });

      const { data: candidate, error: fetchError } = await supabase.from('candidates').select('*').eq('id', candidateId).single();
      if (fetchError || !candidate) return res.status(404).json({ ok: false, error: 'Candidate not found' });

      const oldStatus = candidate.status;

      const updatePayload = {
        status: actionConfig.status,
        public_status: actionConfig.public_status,
        public_status_message: actionConfig.public_status_message,
      };

      if (actionConfig.archive) {
        updatePayload.archived = true;
        updatePayload.archived_at = new Date().toISOString();
      }
      if (actionConfig.hired) {
        updatePayload.hired_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase.from('candidates').update(updatePayload).eq('id', candidateId);
      if (updateError) throw updateError;

      auditLog(supabase, {
        ...auditBase,
        candidate_id: candidateId,
        application_id: candidate.application_id,
        action: `action_${action}`,
        field: 'status',
        old_value: oldStatus,
        new_value: actionConfig.status,
      });

      let emailLogId = null;

      if (actionConfig.email_template) {
        const { data: template } = await supabase.from('email_templates').select('subject, body').eq('template_key', actionConfig.email_template).single();
        if (template) {
          const vars = { name: candidate.full_name, email: candidate.email, position: candidate.position, application_id: candidate.application_id, ...emailVars };
          const render = (tpl) => tpl.replace(/{{(\w+)}}/g, (_, k) => vars[k] || '');

          const subject = render(template.subject);
          const body = render(template.body);
          const to = candidate.email;

          if (process.env.RESEND_API_KEY) {
            try {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: 'Urban Mistrii Studio <hr@urbanmistrii.com>', to, subject, text: body }),
              });
              const resData = await res.json();
              emailLogId = await logEmail(supabase, {
                candidate_id: candidateId,
                application_id: candidate.application_id,
                recipient: to,
                subject,
                body_preview: body.slice(0, 200),
                template_key: actionConfig.email_template,
                recruiter_email: user.email,
                status: res.ok ? 'sent' : 'failed',
                provider_message_id: resData?.id || null,
                error_message: res.ok ? null : JSON.stringify(resData),
              });
            } catch (emailErr) {
              console.error('Email send failed:', emailErr);
              emailLogId = await logEmail(supabase, {
                candidate_id: candidateId,
                application_id: candidate.application_id,
                recipient: to,
                subject,
                template_key: actionConfig.email_template,
                recruiter_email: user.email,
                status: 'failed',
                error_message: emailErr.message,
              });
            }
          } else {
            console.log(`Email to ${to}: ${subject}`);
          }
        }
      }

      return res.json({ ok: true, emailLogId });
    }

    return res.status(404).json({ ok: false, error: 'Not found' });
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
