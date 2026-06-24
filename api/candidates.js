const { createClient } = require('@supabase/supabase-js');
const google = require('./lib/google');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xcbpmntovmzdjbphivzt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_POSITIONS = [
  'Architect', 'Junior Architect', 'Interior Designer',
  'Visualizer', 'Project Manager', 'Growth & Marketing', 'Internship',
];

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const STATUS_DESCRIPTIONS = {
  Applied: 'Your application has been received and is being reviewed by our team.',
  Reviewing: 'Our team is currently reviewing your application and portfolio.',
  'Assignment Sent': 'An assignment has been sent to you for evaluation.',
  'Assignment Submitted': 'We have received your completed assignment and it is under review.',
  'Interview Scheduled': 'You have progressed to the interview stage. Please check your email for scheduling details.',
  'Offer Extended': 'Congratulations. An offer has been issued to you.',
  Rejected: 'We will not be moving forward with your application at this time.',
  'Talent Pool': 'Your profile has been retained for future opportunities that may match your experience.',
  Hired: 'Welcome to Urban Mistrii Studio! We look forward to having you on the team.',
};

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  if (!phone) return true;
  return /^(\+91|0)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''));
}

function validateFields(body) {
  const errors = [];

  if (!body.full_name || !body.full_name.trim()) {
    errors.push('full_name is required');
  }

  if (!body.email || !body.email.trim()) {
    errors.push('email is required');
  } else if (!validateEmail(body.email.trim())) {
    errors.push('Invalid email format');
  }

  if (body.phone && !validatePhone(body.phone)) {
    errors.push('Invalid phone format (use +91 or 10-digit Indian number)');
  }

  if (!body.position) {
    errors.push('position is required');
  } else if (!VALID_POSITIONS.includes(body.position)) {
    errors.push(`Invalid position. Must be one of: ${VALID_POSITIONS.join(', ')}`);
  }

  return errors;
}

const ALLOWED_RESUME_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

async function validateResumeFile(resumeUrl) {
  try {
    const headResp = await fetch(resumeUrl, { method: 'HEAD' });
    if (!headResp.ok) return 'Resume file is not accessible';

    const contentType = headResp.headers.get('content-type') || '';
    const contentLength = parseInt(headResp.headers.get('content-length') || '0', 10);

    if (!ALLOWED_RESUME_TYPES.includes(contentType)) {
      return `Resume type "${contentType}" is not allowed (PDF or DOC required)`;
    }
    if (contentLength > MAX_RESUME_SIZE) {
      return `Resume exceeds maximum size of ${MAX_RESUME_SIZE / 1024 / 1024} MB`;
    }
    return null;
  } catch {
    return 'Could not validate resume file';
  }
}

async function deleteStorageFile(resumeUrl) {
  try {
    const url = new URL(resumeUrl);
    const pathMatch = url.pathname.match(/\/object\/public\/resumes\/(.+)/);
    if (!pathMatch) return;
    const fileName = pathMatch[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.storage.from('resumes').remove([fileName]);
  } catch (e) {
    console.error('Failed to clean up invalid resume:', e);
  }
}

function hasGoogleConfig() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
}

function hasSupabaseConfig() {
  return !!SUPABASE_SERVICE_KEY;
}

async function recordFailedSync(target, payload, errorMessage) {
  if (!hasSupabaseConfig()) return;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('failed_syncs').insert({
      target,
      payload,
      error_message: errorMessage,
      status: 'pending',
    });
  } catch (e) {
    console.error('Failed to record sync failure:', e);
  }
}

async function rateLimitCheck(req) {
  if (!hasSupabaseConfig()) return null;
  try {
    const ip = getClientIP(req);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from('status_queries')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', cutoff);
    if (count >= RATE_LIMIT_MAX) {
      return `Rate limit exceeded. Max ${RATE_LIMIT_MAX} queries per ${RATE_LIMIT_WINDOW_MS / 60000} minutes.`;
    }
    return null;
  } catch (e) {
    console.error('Rate limit check error:', e);
    return null;
  }
}

async function logStatusQuery(req, queryType, identifier) {
  if (!hasSupabaseConfig()) return;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from('status_queries').insert({
      ip_address: getClientIP(req),
      identifier: identifier || null,
      query_type: queryType,
    });
  } catch (e) {
    console.error('Status query log error:', e);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'GET') return handleLookup(req, res);

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

async function handleCreate(req, res) {
  try {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 4.5 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'Request body too large (max 4.5 MB)' });
    }

    const {
      full_name, email, phone, city, position,
      experience, current_employer, portfolio_url,
      linkedin_url, resume_url, cover_letter,
    } = req.body || {};

    const validationErrors = validateFields(req.body || {});
    if (validationErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: validationErrors.join('; '),
      });
    }

    if (resume_url) {
      const resumeError = await validateResumeFile(resume_url);
      if (resumeError) {
        await deleteStorageFile(resume_url);
        return res.status(400).json({ ok: false, error: resumeError });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim() : null;

    let applicationId = null;
    let candidateId = null;
    let googleSyncSuccess = false;
    let syncError = null;
    let driveUrl = null;

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const record = {
          full_name: full_name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          city: city?.trim() || null,
          position,
          experience: experience?.trim() || null,
          current_employer: current_employer?.trim() || null,
          portfolio_url: portfolio_url?.trim() || null,
          linkedin_url: linkedin_url?.trim() || null,
          resume_url: resume_url?.trim() || null,
          cover_letter: cover_letter?.trim() || null,
        };
        const { data, error } = await supabase.from('candidates').insert(record).select().single();
        if (error) throw error;
        applicationId = data.application_id;
        candidateId = data.id;
        driveUrl = data.resume_url || null;
      } catch (err) {
        console.error('Supabase insert failed:', err);
        syncError = err.message;
        applicationId = `UM-${Date.now().toString(36).toUpperCase()}-FL`;
      }
    } else {
      applicationId = `UM-${Date.now().toString(36).toUpperCase()}-S`;
    }

    if (hasGoogleConfig() && applicationId && !applicationId.endsWith('-FL') && !applicationId.endsWith('-S')) {
      try {
        const config = google.getServiceAccountConfig();
        const accessToken = await google.getAccessToken(config);

        const now = new Date().toISOString();
        await google.appendToSheet(accessToken, config.spreadsheetId, [
          applicationId,
          full_name.trim(),
          cleanEmail,
          cleanPhone || '',
          city?.trim() || '',
          position,
          experience?.trim() || '',
          current_employer?.trim() || '',
          portfolio_url?.trim() || '',
          linkedin_url?.trim() || '',
          resume_url?.trim() || '',
          cover_letter?.trim() || '',
          'Applied',
          now,
          now,
        ]);

        if (resume_url && config.driveFolderId && accessToken) {
          try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const fileResp = await fetch(resume_url);
            if (fileResp.ok) {
              const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
              const mimeType = fileResp.headers.get('content-type') || 'application/pdf';
              const fileName = `Resume-${applicationId}-${full_name.trim().replace(/\s+/g, '_')}.pdf`;
              const driveResult = await google.uploadToDrive(accessToken, fileName, fileBuffer, mimeType, config.driveFolderId);
              if (driveResult?.webViewLink) {
                driveUrl = driveResult.webViewLink;
              }
            }
          } catch (driveErr) {
            console.error('Drive upload failed:', driveErr);
            await recordFailedSync('google_drive', { applicationId, resume_url }, driveErr.message);
          }
        }

        googleSyncSuccess = true;
      } catch (err) {
        console.error('Google sync failed:', err);
        syncError = err.message;
        await recordFailedSync('google_sheets', { applicationId, full_name, email: cleanEmail }, err.message);
      }
    }

    if (hasSupabaseConfig() && candidateId && process.env.RESEND_API_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, body')
          .eq('template_key', 'application_received')
          .single();

        if (template) {
          const vars = { name: full_name.trim(), email: cleanEmail, position, application_id: applicationId };
          const render = (tpl) => tpl.replace(/{{(\w+)}}/g, (_, k) => vars[k] || '');
          const renderedSubject = render(template.subject);
          const renderedBody = render(template.body);

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'Urban Mistrii Studio <hr@urbanmistrii.com>', to: cleanEmail, subject: renderedSubject, text: renderedBody }),
          });
          const emailData = await emailRes.json();

          await supabase.from('email_logs').insert({
            candidate_id: candidateId,
            application_id: applicationId,
            recipient: cleanEmail,
            subject: renderedSubject,
            body_preview: renderedBody.slice(0, 200),
            template_key: 'application_received',
            status: emailRes.ok ? 'sent' : 'failed',
            provider_message_id: emailData?.id || null,
            error_message: emailRes.ok ? null : JSON.stringify(emailData),
          });
        }
      } catch (emailErr) {
        console.error('Confirmation email failed:', emailErr);
      }
    }

    return res.status(200).json({
      ok: true,
      applicationId,
      candidateId,
      resumeUrl: driveUrl,
      googleSync: googleSyncSuccess,
      syncError: syncError || undefined,
    });
  } catch (error) {
    console.error('handleCreate error:', error);
    const fallbackId = `UM-${Date.now().toString(36).toUpperCase()}-EM`;
    return res.status(200).json({
      ok: true,
      applicationId: fallbackId,
      googleSync: false,
      syncError: 'Emergency fallback — record may need manual entry',
    });
  }
}

async function handleLookup(req, res) {
  try {
    const { applicationId, email } = req.query;

    if (!applicationId && !email) {
      return res.status(400).json({
        ok: false,
        error: 'Provide applicationId or email',
      });
    }

    const queryType = applicationId ? 'application_id' : 'email';

    const rateLimitError = await rateLimitCheck(req);
    if (rateLimitError) {
      return res.status(429).json({ ok: false, error: rateLimitError });
    }

    await logStatusQuery(req, queryType, (applicationId || email).toLowerCase());

    if (hasSupabaseConfig()) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        let query = supabase
          .from('candidates')
          .select('full_name, position, application_date, status, updated_at, application_id');

        if (applicationId) {
          query = query.eq('application_id', applicationId.toUpperCase().trim());
        } else {
          query = query.eq('email', email.toLowerCase().trim());
        }

        const { data, error } = await query.order('application_date', { ascending: false }).limit(1).single();

        if (!error && data) {
          return res.status(200).json({
            ok: true,
            candidate: {
              name: data.full_name || '',
              position: data.position || '',
              applicationDate: data.application_date || '',
              lastUpdated: data.updated_at || '',
              status: data.status || '',
              description: STATUS_DESCRIPTIONS[data.status] || '',
            },
          });
        }
      } catch (err) {
        console.error('Supabase lookup error:', err);
      }
    }

    return res.status(404).json({ ok: false, error: 'Candidate not found' });
  } catch (error) {
    console.error('handleLookup error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
