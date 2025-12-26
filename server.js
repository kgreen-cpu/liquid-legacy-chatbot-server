const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets configuration - reading from environment variable
let credentials;
if (process.env.GOOGLE_CREDENTIALS) {
    try {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log('✓ Loaded Google credentials from environment variable');
        console.log('✓ Service account:', credentials.client_email);
    } catch (e) {
        console.error('Error parsing GOOGLE_CREDENTIALS:', e.message);
    }
} else {
    console.error('GOOGLE_CREDENTIALS environment variable not set');
}

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Email configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize Google Sheets API client
async function getAuthenticatedClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth.getClient();
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'Liquid Legacy Chatbot Server is running!',
        version: '3.0.0',
        endpoints: ['/api/sheets-submit', '/api/book-appointment']
    });
});

// ============================================================
// ENDPOINT 1: Submit lead data to Google Sheets
// ============================================================
app.post('/api/sheets-submit', async (req, res) => {
    try {
        const leadData = req.body;
        console.log('Received lead data:', leadData.lead_first_name, leadData.lead_last_name);

        const authClient = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const timestamp = new Date().toISOString();

        // COMPLETE ROW - 69 columns matching the Leads sheet exactly
        // This captures EVERY piece of information from the chatbot
        const row = [
            // BASIC INFO (A-I)
            timestamp,                              // A: Timestamp
            leadData.lead_first_name || '',         // B: First Name
            leadData.lead_last_name || '',          // C: Last Name
            leadData.lead_email || '',              // D: Email
            leadData.lead_phone || '',              // E: Phone
            leadData.sms_consent || '',             // F: SMS Consent
            leadData.lead_age || '',                // G: Age
            leadData.lead_state || '',              // H: State
            leadData.lead_state_other || '',        // I: State (Other)
            
            // WHAT BROUGHT THEM (J-L)
            leadData.primary_focus || '',           // J: Primary Focus (self/family/business/all)
            leadData.timeline || '',                // K: Timeline (ASAP/30 days/60-90/exploring)
            leadData.trigger_reason || '',          // L: Trigger Reason (baby/house/married/health/death/responsible)
            
            // EMPLOYMENT & INCOME (M-P)
            leadData.employment_type || '',         // M: Employment Type
            leadData.occupation || '',              // N: Occupation
            leadData.income_range || '',            // O: Income Range
            leadData.income_stability || '',        // P: Income Stability
            
            // BUSINESS INFO (Q-W)
            leadData.decision_role || '',           // Q: Decision Role (Owner/Partner/Manager)
            leadData.trade_type || '',              // R: Trade/Industry
            leadData.business_name || '',           // S: Business Name
            leadData.years_in_business || '',       // T: Years in Business
            leadData.team_size || '',               // U: Team Size
            leadData.annual_revenue_range || '',    // V: Annual Revenue
            leadData.tax_pain_level || '',          // W: Tax Pain Level
            
            // FAMILY SITUATION (X-AE)
            leadData.has_partner || '',             // X: Relationship Status
            leadData.partner_works || '',           // Y: Partner Works
            leadData.partner_income_sufficiency || '', // Z: Partner Income Sufficiency
            leadData.has_kids || '',                // AA: Has Kids
            leadData.first_baby || '',              // AB: First Baby
            leadData.kids_ages || '',               // AC: Kids Ages (multiselect)
            leadData.kids_expenses || '',           // AD: Kids Expenses (multiselect)
            leadData.other_dependents || '',        // AE: Other Dependents (multiselect)
            
            // FINANCIAL PICTURE (AF-AQ)
            leadData.home_status || '',             // AF: Home Status
            leadData.mortgage_balance || '',        // AG: Mortgage Balance
            leadData.monthly_expenses || '',        // AH: Monthly Expenses
            leadData.debt_types || '',              // AI: Debt Types (multiselect)
            leadData.emergency_fund || '',          // AJ: Emergency Fund
            leadData.savings_amount || '',          // AK: Savings Amount
            leadData.retirement_accounts || '',     // AL: Retirement Accounts
            leadData.retirement_tax_concern || '',  // AM: Retirement Tax Concern
            leadData.guaranteed_income_interest || '', // AN: Guaranteed Income Interest (annuity)
            leadData.lump_sum_available || '',      // AO: Lump Sum Available
            leadData.biggest_risk || '',            // AP: Biggest Risk (multiselect)
            leadData.protection_priority || '',     // AQ: Protection Priority (multiselect)
            
            // CURRENT COVERAGE (AR-AV)
            leadData.has_life_insurance || '',      // AR: Has Life Insurance
            leadData.why_no_insurance || '',        // AS: Why No Insurance (multiselect)
            leadData.current_coverage_amount || '', // AT: Current Coverage Amount
            leadData.current_policy_types || '',    // AU: Current Policy Types (multiselect)
            leadData.coverage_confidence || '',     // AV: Coverage Confidence
            
            // POLICY PREFERENCES (AW-BA)
            leadData.preference_style || '',        // AW: Preference Style (multiselect)
            leadData.goal_type || '',               // AX: Goal Type
            leadData.time_horizon || '',            // AY: Time Horizon
            leadData.funding_commitment || '',      // AZ: Funding Commitment
            leadData.monthly_budget || '',          // BA: Monthly Budget
            
            // HEALTH INFO (BB-BD)
            leadData.nicotine_use || '',            // BB: Nicotine Use
            leadData.health_status || '',           // BC: Health Status
            leadData.health_conditions || '',       // BD: Health Conditions (multiselect)
            
            // LEAD SCORING (BE-BG)
            leadData.lead_score || '',              // BE: Lead Score
            leadData.lead_tier || '',               // BF: Lead Tier (A/B/C/D)
            leadData.recommended_session || '',     // BG: Recommended Session
            
            // TRACKING & ATTRIBUTION (BH-BN)
            leadData.utm_source || '',              // BH: UTM Source
            leadData.utm_medium || '',              // BI: UTM Medium
            leadData.utm_campaign || '',            // BJ: UTM Campaign
            leadData.utm_content || '',             // BK: UTM Content
            leadData.utm_term || '',                // BL: UTM Term
            leadData.landing_page || '',            // BM: Landing Page
            leadData.referrer || '',                // BN: Referrer
            
            // OTHER (BO-BQ)
            leadData.owner_email || '',             // BO: Owner Email (if not decision maker)
            leadData.session_duration || '',        // BP: Session Duration
            leadData.notes || ''                    // BQ: Notes
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Leads!A:BQ',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });

        console.log('✓ Successfully wrote to Google Sheets - all 69 fields captured');
        res.json({ 
            success: true, 
            message: 'Lead data saved successfully',
            leadScore: leadData.lead_score,
            leadTier: leadData.lead_tier
        });

    } catch (error) {
        console.error('Error writing to Google Sheets:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save lead data',
            details: error.message 
        });
    }
});

// ============================================================
// ENDPOINT 2: Book appointment and send emails
// ============================================================
app.post('/api/book-appointment', async (req, res) => {
    try {
        const data = req.body;
        console.log('Booking appointment for:', data.lead_first_name, data.lead_last_name);

        const formattedDateTime = data.appointment_formatted || '';
        const parts = formattedDateTime.split(' at ');
        const formattedDate = parts[0] || 'Date TBD';
        const formattedTime = parts[1] || 'Time TBD';
        
        // Check if this time slot is already booked
        try {
            const authClient = await getAuthenticatedClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });
            
            const existingBookings = await sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Bookings!A:B'
            });
            
            const requestedTime = data.appointment_date;  // ISO timestamp from chatbot
            const rows = existingBookings.data.values || [];
            
            for (const row of rows) {
                if (row[0] === requestedTime) {
                    console.log('Time slot already booked:', requestedTime);
                    return res.status(409).json({
                        success: false,
                        error: 'TIME_SLOT_TAKEN',
                        message: 'This time slot has already been booked. Please select a different time.'
                    });
                }
            }
            
            // Save the booking to the Bookings sheet
            await sheets.spreadsheets.values.append({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Bookings!A:J',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { 
                    values: [[
                        requestedTime,                    // A: Booking Timestamp (ISO)
                        formattedDateTime,                // B: Formatted DateTime
                        data.lead_first_name || '',       // C: First Name
                        data.lead_last_name || '',        // D: Last Name
                        data.lead_email || '',            // E: Email
                        data.lead_phone || '',            // F: Phone
                        data.session_type || '',          // G: Session Type
                        data.lead_tier || '',             // H: Lead Tier
                        data.lead_score || '',            // I: Lead Score
                        'Scheduled'                       // J: Status
                    ]] 
                }
            });
            console.log('✓ Booking saved to sheet');
            
        } catch (sheetError) {
            console.error('Error checking availability:', sheetError.message);
        }

        // Send branded HTML email to business owner
        const sessionDuration = data.session_duration || (data.session_type?.includes('Business') ? '45' : data.session_type?.includes('Family') ? '30' : '15');
        
        const ownerEmailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="color: #d4a84b; margin: 0; font-size: 28px; font-weight: normal;">New Appointment Booked!</h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px;">
                            
                            <!-- Session Type Header -->
                            <p style="font-size: 14px; color: #888; margin: 0 0 5px 0;">📅</p>
                            <h2 style="color: #d4a84b; font-size: 24px; margin: 0 0 20px 0; font-weight: normal;">${data.session_type || 'Consultation'}</h2>
                            
                            <!-- Appointment Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Date:</strong> <span style="color: #555;">${formattedDate}</span></p>
                                        <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Time:</strong> <span style="color: #555;">${formattedTime}</span></p>
                                        <p style="margin: 0;"><strong style="color: #333;">Duration:</strong> <span style="color: #555;">${sessionDuration} minutes</span></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Contact Information -->
                            <h3 style="color: #d4a84b; font-size: 18px; margin: 0 0 15px 0; font-weight: normal;">Contact Information</h3>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Name:</strong> <span style="color: #555;">${data.lead_first_name} ${data.lead_last_name}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Email:</strong> <a href="mailto:${data.lead_email}" style="color: #d4a84b;">${data.lead_email}</a></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Phone:</strong> <a href="tel:${data.lead_phone}" style="color: #d4a84b;">${data.lead_phone}</a></p>
                            <p style="margin: 0 0 25px 0;"><strong style="color: #333;">State:</strong> <span style="color: #555;">${data.lead_state || 'N/A'}</span></p>
                            
                            <!-- Lead Details -->
                            <h3 style="color: #d4a84b; font-size: 18px; margin: 0 0 15px 0; font-weight: normal;">Lead Details</h3>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Looking to protect:</strong> <span style="color: #555;">${data.primary_focus || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Lead Score:</strong> <span style="color: #555;">${data.lead_score || 'N/A'} (Tier ${data.lead_tier || '?'})</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Completion Type:</strong> <span style="color: #555;">Full Questionnaire</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Income:</strong> <span style="color: #555;">${data.income_range || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Monthly Expenses:</strong> <span style="color: #555;">${data.monthly_expenses || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Employment:</strong> <span style="color: #555;">${data.employment_type || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Occupation:</strong> <span style="color: #555;">${data.occupation || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Relationship:</strong> <span style="color: #555;">${data.has_partner || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Children:</strong> <span style="color: #555;">${data.has_kids || 'N/A'}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong style="color: #333;">Budget:</strong> <span style="color: #555;">${data.monthly_budget || 'N/A'}/month</span></p>
                            <p style="margin: 0 0 25px 0;"><strong style="color: #333;">Timeline:</strong> <span style="color: #555;">${data.timeline || 'N/A'}</span></p>
                            
                            <!-- Notes -->
                            <h3 style="color: #d4a84b; font-size: 18px; margin: 0 0 15px 0; font-weight: normal;">Notes</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 4px solid #d4a84b; background-color: #faf8f5;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">${data.notes || 'No additional notes'}</p>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `🔔 New Booking: ${data.lead_first_name} ${data.lead_last_name} - Tier ${data.lead_tier || '?'} - ${formattedDateTime}`,
            html: ownerEmailHTML
        });
        console.log('✓ Email sent to owner');

        // Send branded HTML confirmation email to lead
        const leadEmailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="color: #d4a84b; margin: 0; font-size: 28px; font-weight: normal;">You're All Set!</h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Hi ${data.lead_first_name},</p>
                            
                            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                                Thank you for taking the time to schedule a call with me — I'm looking forward to connecting with you!
                            </p>
                            
                            <!-- Appointment Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f5; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">YOUR APPOINTMENT</p>
                                        <p style="color: #d4a84b; font-size: 24px; font-weight: bold; margin: 0 0 5px 0;">${formattedDate}</p>
                                        <p style="color: #333; font-size: 20px; margin: 0 0 5px 0;">${formattedTime}</p>
                                        <p style="color: #888; font-size: 14px; margin: 0;">${sessionDuration} minutes</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 25px 0;">
                                I'll reach out to you at <span style="color: #d4a84b; font-weight: bold;">${data.lead_phone}</span> at your scheduled time.
                            </p>
                            
                            <!-- What to Expect Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 4px solid #d4a84b; background-color: #faf8f5; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #d4a84b; font-size: 18px; font-weight: bold; margin: 0 0 15px 0;">What to Expect</p>
                                        
                                        <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 15px 0;">
                                            <strong style="color: #333;">Our First Call</strong> is all about getting to know <em>you</em>. I want to understand your life, your family, your goals, what keeps you up at night, and what legacy you want to leave behind. This isn't a sales pitch — it's a conversation to truly understand your unique situation and what matters most to you.
                                        </p>
                                        
                                        <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0;">
                                            <strong style="color: #333;">Our Second Call</strong> is where I'll present customized protection strategies tailored specifically to your risks, budget, lifestyle, and protection needs. Everything I recommend will be based on what we discussed in our first conversation — because cookie-cutter solutions don't protect real families.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                                There's no pressure, no obligation, and no awkward sales tactics. Just an honest conversation about protecting what you've built.
                            </p>
                            
                            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                                If you have any questions before our call, feel free to reply to this email.
                            </p>
                            
                            <p style="font-size: 16px; color: #555; margin: 0 0 25px 0;">Looking forward to speaking with you,</p>
                            
                            <!-- Signature -->
                            <p style="margin: 0;">
                                <span style="color: #d4a84b; font-size: 20px; font-weight: bold;">Killyan Green</span><br>
                                <span style="color: #666; font-size: 14px;">Founder, Liquid Legacy Financial</span><br>
                                <a href="mailto:kgreen@liquidlegacyfinancial.com" style="color: #d4a84b; font-size: 14px; text-decoration: none;">kgreen@liquidlegacyfinancial.com</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 13px; margin: 0;">
                                Need to reschedule? No problem — just reply to this email.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: data.lead_email,
            subject: `You're All Set! - ${formattedDate} at ${formattedTime}`,
            html: leadEmailHTML
        });
        console.log('✓ Confirmation email sent to lead');

        res.json({ 
            success: true, 
            message: 'Appointment booked successfully',
            appointment: formattedDateTime
        });

    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to book appointment',
            details: error.message 
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Liquid Legacy Chatbot Server v3.0`);
    console.log(`========================================`);
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Google Sheet ID: ${GOOGLE_SHEET_ID}`);
    console.log(`✓ Email User: ${process.env.EMAIL_USER}`);
    console.log(`✓ Capturing 69 data fields per lead`);
    console.log(`========================================\n`);
});
