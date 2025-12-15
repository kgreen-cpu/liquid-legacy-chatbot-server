/**
 * LIQUID LEGACY FINANCIAL - Chatbot Server v5
 * Handles lead data submission to Google Sheets
 * 
 * Deploy to: Render.com
 * Environment Variables Required:
 *   - GOOGLE_SHEET_ID: Your Google Sheet ID
 *   - GOOGLE_CREDENTIALS: JSON string of service account credentials (optional if using file)
 */

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets Authentication
let sheetsAuth;

async function initializeGoogleAuth() {
  try {
    // Try environment variable first (for Render)
    if (process.env.GOOGLE_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      sheetsAuth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else {
      // Fall back to local file
      sheetsAuth = new google.auth.GoogleAuth({
        keyFile: './liquid-legacy-chatbot-4c90d5ba6bd3.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }
    console.log('Google Auth initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error.message);
  }
}

// Initialize auth on startup
initializeGoogleAuth();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Liquid Legacy Financial Chatbot Server',
    version: '5.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Test Google Sheets connection
app.get('/api/test-sheets', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title'
    });
    
    res.json({
      status: 'connected',
      spreadsheet: response.data.properties.title,
      sheets: response.data.sheets.map(s => s.properties.title)
    });
  } catch (error) {
    console.error('Sheets test error:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Main endpoint - Submit lead data to Google Sheets
app.post('/api/sheets-submit', async (req, res) => {
  try {
    const data = req.body;
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Map chatbot data to spreadsheet columns (must match Field Mapping sheet)
    // Total: 62 columns (A through BJ)
    const rowData = [
      data.timestamp || new Date().toISOString(),
      data.lead_first_name || '',
      data.lead_last_name || '',
      data.lead_email || '',
      data.lead_phone || '',
      data.sms_consent || '',
      data.lead_state || '',
      data.lead_state_other || '',
      data.primary_focus || '',
      data.decision_role || '',
      // Business info
      data.trade_type || '',
      data.business_name || '',
      data.years_in_business || '',
      data.team_size || '',
      data.annual_revenue_range || '',
      data.tax_pain_level || '',
      // Work/Income
      data.employment_type || '',
      data.occupation || '',
      data.income_range || '',
      data.income_stability || '',
      // Family
      data.has_partner || '',
      data.partner_works || '',
      data.partner_income_sufficiency || '',
      data.has_kids || '',
      data.kids_ages || '',
      data.kids_expenses || '',
      data.other_dependents || '',
      // Finances
      data.home_status || '',
      data.mortgage_balance || '',
      data.monthly_expenses || '',
      data.debt_types || '',
      data.emergency_fund || '',
      // Risk/Priority
      data.biggest_risk || '',
      data.protection_priority || '',
      // Current Coverage
      data.has_life_insurance || '',
      data.why_no_insurance || '',
      data.current_coverage_amount || '',
      data.current_policy_types || '',
      data.coverage_confidence || '',
      // Preferences
      data.preference_style || '',
      data.goal_type || '',
      data.time_horizon || '',
      data.funding_commitment || '',
      data.monthly_budget || '',
      // Health
      data.lead_age || '',
      data.nicotine_use || '',
      data.health_status || '',
      data.health_conditions || '',
      data.health_other || '',
      // Intent
      data.timeline || '',
      data.trigger_reason || '',
      // Tracking (UTM)
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.utm_content || '',
      data.utm_term || '',
      data.landing_page || '',
      data.referrer || '',
      // Calculated fields
      data.lead_score || '',
      data.lead_tier || '',
      data.booking_type || '',
      data.notes || ''
    ];
    
    // Append to the Leads sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Leads!A:BJ',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
    
    console.log(`Lead added: ${data.lead_first_name} ${data.lead_last_name} | Tier: ${data.lead_tier} | Source: ${data.utm_source || 'direct'}`);
    
    res.json({
      status: 'success',
      message: 'Lead saved successfully',
      updatedRange: response.data.updates.updatedRange
    });
    
  } catch (error) {
    console.error('Error saving lead:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save lead',
      error: error.message
    });
  }
});

// Owner referral endpoint (for non-decision makers)
app.post('/api/owner-referral', async (req, res) => {
  try {
    const data = req.body;
    const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const rowData = [
      new Date().toISOString(),
      data.lead_first_name || '',
      data.lead_last_name || '',
      '', // email (referrer doesn't have)
      '', // phone
      '',
      data.lead_state || '',
      data.lead_state_other || '',
      data.primary_focus || '',
      'Referral', // decision_role
      // Fill rest with empty strings
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      '', '', '', '',
      '', '', '',
      `Owner contact: ${data.owner_email || ''} ${data.owner_phone || ''}`
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Leads!A:BJ',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });
    
    res.json({ status: 'success', message: 'Owner referral saved' });
    
  } catch (error) {
    console.error('Error saving referral:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   LIQUID LEGACY FINANCIAL - Chatbot Server v5             ║
║   Running on port ${PORT}                                     ║
║   Ready to capture leads!                                 ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
