const crypto = require('crypto');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

function base64URLEncode(buf) {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getServiceAccountConfig() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!privateKey || !clientEmail) {
    return null;
  }

  return {
    privateKey: privateKey.replace(/\\n/g, '\n'),
    clientEmail,
    spreadsheetId: spreadsheetId || null,
    driveFolderId: driveFolderId || null,
  };
}

async function getAccessToken(config) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedClaimSet = base64URLEncode(Buffer.from(JSON.stringify(claimSet)));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = base64URLEncode(signer.sign(config.privateKey));

  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google token error: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function appendToSheet(accessToken, spreadsheetId, values) {
  if (!spreadsheetId) return null;

  const url = `${SHEETS_API}/${spreadsheetId}/values/Candidates:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sheets append error: ${err}`);
  }

  const data = await response.json();
  return data;
}

async function uploadToDrive(accessToken, fileName, fileBuffer, mimeType, folderId) {
  if (!folderId) return null;

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = 'urban_mistrii_drive_boundary';
  const bodyParts = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    'Content-Transfer-Encoding: base64',
    '',
    fileBuffer.toString('base64'),
    `--${boundary}--`,
  ];
  const body = bodyParts.join('\r\n');

  const response = await fetch(DRIVE_UPLOAD_URL + '?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive upload error: ${err}`);
  }

  const data = await response.json();
  return { id: data.id, webViewLink: data.webViewLink };
}

module.exports = {
  getServiceAccountConfig,
  getAccessToken,
  appendToSheet,
  uploadToDrive,
};
