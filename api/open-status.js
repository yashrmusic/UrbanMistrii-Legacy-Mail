// Urban Mistrii Company Open Status API
// Returns whether the company is open today based on:
//   - Day of week + Saturday schedule
//   - Holidays table
//   - Manual day overrides

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xcbpmntovmzdjbphivzt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XsE5hKxS3XCTgpYIY2Cdkg_376eKe7h';

function getSaturdaySchedule(saturdayIndex) {
  // 1st Sat = Working, 2nd = Closed, 3rd = Working, 4th = Closed, 5th = Working
  if (saturdayIndex % 2 === 1) return 'closed';
  return 'open';
}

function getSaturdayIndex(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  let count = 0;
  for (let d = 1; d <= day; d++) {
    const testDate = new Date(year, month, d);
    if (testDate.getDay() === 6) count++;
  }
  return count;
}

function getTodayInfo(timezone) {
  const now = new Date();
  const options = { timeZone: timezone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

  const getPart = (type) => parts.find(p => p.type === type)?.value || '';

  const weekday = getPart('weekday');
  const month = getPart('month');
  const day = getPart('day');
  const year = getPart('year');

  const dateStr = `${year}-${month}-${day}`;
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);

  return { now, dateStr, dayOfWeek, weekday };
}

function calculateStatus(dateStr, dayOfWeek, holidays, overrides, workingHours, saturdayIndex) {
  // 1. Check manual overrides first
  const override = overrides.find(o => o.date === dateStr);
  if (override) {
    return {
      status: override.status === 'closed' ? 'closed' : 'open',
      reason: override.reason || 'Manual override',
      isHoliday: false,
      isOverride: true,
      workingHours: override.status === 'closed' ? null : workingHours,
    };
  }

  // 2. Check holidays
  const holiday = holidays.find(h => h.date === dateStr);
  if (holiday) {
    return {
      status: 'closed',
      reason: holiday.name,
      isHoliday: true,
      isOverride: false,
      workingHours: null,
    };
  }

  // 3. Check day of week
  if (dayOfWeek === 0) {
    // Sunday = always closed
    return {
      status: 'closed',
      reason: 'Sunday',
      isHoliday: false,
      isOverride: false,
      workingHours: null,
    };
  }

  if (dayOfWeek === 6) {
    // Saturday = check schedule
    const satStatus = getSaturdaySchedule(saturdayIndex);
    if (satStatus === 'closed') {
      return {
        status: 'closed',
        reason: `Weekend (${getSaturdayOrdinal(saturdayIndex)} Saturday)`,
        isHoliday: false,
        isOverride: false,
        workingHours: null,
      };
    }
  }

  // 4. Working day
  return {
    status: 'open',
    reason: null,
    isHoliday: false,
    isOverride: false,
    workingHours,
  };
}

function getSaturdayOrdinal(index) {
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
  return ordinals[index - 1] || `${index}th`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Support checking a specific date
    const queryDate = req.query?.date || null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch settings, holidays, and overrides in parallel
    const [settingsResult, holidaysResult, overridesResult] = await Promise.all([
      supabase.from('company_settings').select('key, value'),
      supabase.from('holidays').select('date, name').gte('date', queryDate || new Date().toISOString().slice(0, 10)),
      supabase.from('day_overrides').select('date, status, reason').gte('date', queryDate || new Date().toISOString().slice(0, 10)),
    ]);

    const settings = {};
    if (settingsResult.data) {
      for (const s of settingsResult.data) {
        settings[s.key] = s.value;
      }
    }

    const timezone = settings.timezone || 'Asia/Kolkata';
    const workingHours = {
      start: settings.working_hours_start || '09:30',
      end: settings.working_hours_end || '18:30',
    };

    const holidays = holidaysResult.data || [];
    const overrides = overridesResult.data || [];

    const { dateStr, dayOfWeek, weekday } = getTodayInfo(timezone);
    const saturdayIndex = getSaturdayIndex(new Date(dateStr + 'T12:00:00'));

    const status = calculateStatus(dateStr, dayOfWeek, holidays, overrides, workingHours, saturdayIndex);

    return res.json({
      ok: true,
      date: dateStr,
      weekday,
      ...status,
      saturdayIndex: dayOfWeek === 6 ? saturdayIndex : null,
      timezone,
    });
  } catch (error) {
    console.error('Open status error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to get status' });
  }
};
