// server.js - Liquid Legacy Financial Chatbot Server
// Handles Google Sheets integration AND appointment booking with email notifications

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets configuration - reading from JSON file
let credentials;
try {
    credentials = require('./liquid-legacy-chatbot-4c90d5ba6bd3.json');
} catch (e) {
    console.error('Could not load credentials file:', e.message);
}

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1d-Zfe4nkCrWyFGFXl3fdFthVrn1_4udK9O4cYKeWlRM';

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
        status: 'Liquid Legacy Financial Server is running!',
        endpoints: ['/api/sheets-submit', '/api/book-appointment'],
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ENDPOINT 1: Save lead data to Google Sheets
// ============================================================
app.post('/api/sheets-submit', async (req, res) => {
    try {
        const leadData = req.body;
        console.log('Received lead data:', leadData.lead_first_name, leadData.lead_last_name);

        const authClient = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const timestamp = new Date().toISOString();
        
        // Build the row with all possible fields
        const row = [
            timestamp,
            leadData.lead_first_name || '',
            leadData.lead_last_name || '',
            leadData.lead_email || '',
            leadData.lead_phone || '',
            leadData.lead_state || '',
            leadData.lead_state_other || '',
            leadData.lead_age || '',
            leadData.primary_focus || '',
            leadData.employment_type || '',
            leadData.occupation || '',
            leadData.income_range || '',
            leadData.income_stability || '',
            leadData.has_partner || '',
            leadData.partner_works || '',
            leadData.partner_income_sufficiency || '',
            leadData.has_kids || '',
            leadData.kids_ages || '',
            leadData.kids_expenses || '',
            leadData.other_dependents || '',
            leadData.home_status || '',
            leadData.mortgage_balance || '',
            leadData.monthly_expenses || '',
            leadData.debt_types || '',
            leadData.emergency_fund || '',
            leadData.biggest_risk || '',
            leadData.protection_priority || '',
            leadData.has_life_insurance || '',
            leadData.why_no_insurance || '',
            leadData.current_coverage_amount || '',
            leadData.current_policy_types || '',
            leadData.coverage_confidence || '',
            leadData.preference_style || '',
            leadData.goal_type || '',
            leadData.time_horizon || '',
            leadData.funding_commitment || '',
            leadData.monthly_budget || '',
            leadData.nicotine_use || '',
            leadData.health_status || '',
            leadData.health_conditions || '',
            leadData.health_other || '',
            leadData.timeline || '',
            leadData.trigger_reason || '',
            leadData.sms_consent || '',
            leadData.decision_role || '',
            leadData.trade_type || '',
            leadData.business_name || '',
            leadData.years_in_business || '',
            leadData.team_size || '',
            leadData.annual_revenue_range || '',
            leadData.tax_pain_level || '',
            leadData.lead_score || '',
            leadData.lead_tier || '',
            leadData.booking_type || '',
            leadData.chat_completion_type || '',
            leadData.notes || '',
            leadData.utm_source || '',
            leadData.utm_medium || '',
            leadData.utm_campaign || '',
            leadData.utm_content || '',
            leadData.utm_term || '',
            leadData.landing_page || '',
            leadData.referrer || '',
            leadData.session_duration || ''
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Sheet1!A:BL',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });

        console.log('Successfully wrote to Google Sheets');
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

        // Use the pre-formatted date/time from the client (already in user's timezone)
        // Format: "Thu, Dec 26 at 4:00 PM"
        const formattedDateTime = data.appointment_formatted || '';
        const parts = formattedDateTime.split(' at ');
        const formattedDate = parts[0] || 'Date TBD';
        const formattedTime = parts[1] || 'Time TBD';
        
        // Check if this time slot is already booked
        try {
            const authClient = await getAuthenticatedClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });
            
            // Get all existing bookings from the Bookings sheet
            const existingBookings = await sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Bookings!A:B'
            });
            
            const rows = existingBookings.data.values || [];
            const requestedTime = data.appointment_date; // ISO string
            
            // Check if this exact time is already booked
            for (const row of rows) {
                if (row[0] === requestedTime) {
                    console.log('Time slot already booked:', formattedDateTime);
                    return res.status(409).json({ 
                        success: false, 
                        error: 'TIME_SLOT_TAKEN',
                        message: 'Sorry, this time slot was just booked by someone else. Please select a different time.'
                    });
                }
            }
            
            // Time is available - save the booking to the Bookings sheet
            await sheets.spreadsheets.values.append({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Bookings!A:B',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { 
                    values: [[requestedTime, formattedDateTime]] 
                }
            });
            
            console.log('Time slot reserved:', formattedDateTime);
            
        } catch (sheetError) {
            console.error('Error checking availability:', sheetError.message);
            // If we can't check, proceed anyway (fail open) but log the error
        }

        // Build email to Killyan
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0a0a; padding: 30px; text-align: center;">
                    <h1 style="color: #d4a84b; margin: 0;">New Appointment Booked!</h1>
                </div>
                
                <div style="background: #1a1a1a; padding: 30px; color: #ffffff;">
                    <h2 style="color: #d4a84b; margin-top: 0;">📅 ${data.session_type}</h2>
                    
                    <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 5px 0; font-size: 18px;"><strong>Date:</strong> ${formattedDate}</p>
                        <p style="margin: 5px 0; font-size: 18px;"><strong>Time:</strong> ${formattedTime}</p>
                        <p style="margin: 5px 0; font-size: 18px;"><strong>Duration:</strong> ${data.session_duration} minutes</p>
                    </div>
                    
                    <h3 style="color: #d4a84b;">Contact Information</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${data.lead_first_name} ${data.lead_last_name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${data.lead_email}" style="color: #d4a84b;">${data.lead_email}</a></p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${data.lead_phone}" style="color: #d4a84b;">${data.lead_phone}</a></p>
                    <p style="margin: 5px 0;"><strong>State:</strong> ${data.lead_state}${data.lead_state_other ? ' (' + data.lead_state_other + ')' : ''}</p>
                    
                    <h3 style="color: #d4a84b;">Lead Details</h3>
                    <p style="margin: 5px 0;"><strong>Looking to protect:</strong> ${data.primary_focus || 'Not specified'}</p>
                    <p style="margin: 5px 0;"><strong>Lead Score:</strong> ${data.lead_score || 'N/A'} (Tier ${data.lead_tier || 'N/A'})</p>
                    <p style="margin: 5px 0;"><strong>Completion Type:</strong> ${data.chat_completion_type === 'quick' ? 'Quick Book (skipped questions)' : 'Full Questionnaire'}</p>
                    
                    ${data.income_range ? `<p style="margin: 5px 0;"><strong>Income:</strong> ${data.income_range}</p>` : ''}
                    ${data.employment_type ? `<p style="margin: 5px 0;"><strong>Employment:</strong> ${data.employment_type}</p>` : ''}
                    ${data.occupation ? `<p style="margin: 5px 0;"><strong>Occupation:</strong> ${data.occupation}</p>` : ''}
                    ${data.has_partner ? `<p style="margin: 5px 0;"><strong>Relationship:</strong> ${data.has_partner}</p>` : ''}
                    ${data.has_kids ? `<p style="margin: 5px 0;"><strong>Children:</strong> ${data.has_kids}</p>` : ''}
                    ${data.monthly_budget ? `<p style="margin: 5px 0;"><strong>Budget:</strong> ${data.monthly_budget}/month</p>` : ''}
                    ${data.timeline ? `<p style="margin: 5px 0;"><strong>Timeline:</strong> ${data.timeline}</p>` : ''}
                    
                    ${data.notes ? `
                    <h3 style="color: #d4a84b;">Notes</h3>
                    <p style="background: #2d2d2d; padding: 15px; border-radius: 8px; border-left: 3px solid #d4a84b;">${data.notes}</p>
                    ` : ''}
                    
                    ${data.utm_source ? `
                    <h3 style="color: #d4a84b;">Source</h3>
                    <p style="margin: 5px 0;"><strong>UTM Source:</strong> ${data.utm_source}</p>
                    ${data.utm_campaign ? `<p style="margin: 5px 0;"><strong>Campaign:</strong> ${data.utm_campaign}</p>` : ''}
                    ${data.utm_medium ? `<p style="margin: 5px 0;"><strong>Medium:</strong> ${data.utm_medium}</p>` : ''}
                    ` : ''}
                </div>
                
                <div style="background: #0a0a0a; padding: 20px; text-align: center;">
                    <p style="color: #666; margin: 0; font-size: 12px;">Liquid Legacy Financial</p>
                </div>
            </div>
        `;

        // Send email to Killyan
        await emailTransporter.sendMail({
            from: `"Liquid Legacy Financial" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `🗓️ New ${data.session_type} - ${data.lead_first_name} ${data.lead_last_name} - ${formattedDate} at ${formattedTime}`,
            html: emailHtml
        });

        console.log('Email sent to owner');

        // Send confirmation email to the lead
        const confirmationHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0a0a; padding: 30px; text-align: center;">
                    <h1 style="color: #d4a84b; margin: 0;">You're All Set!</h1>
                </div>
                
                <div style="background: #1a1a1a; padding: 30px; color: #ffffff;">
                    <p style="font-size: 16px; line-height: 1.6;">Hi ${data.lead_first_name},</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Thank you for taking the time to schedule a call with me — I'm looking forward to connecting with you!</p>
                    
                    <div style="background: #2d2d2d; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #999;">YOUR APPOINTMENT</p>
                        <p style="margin: 0; font-size: 22px; color: #d4a84b; font-weight: bold;">${formattedDate}</p>
                        <p style="margin: 5px 0 0; font-size: 20px; color: #fff;">${formattedTime}</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #999;">30-45 minutes</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">I'll reach out to you at <strong style="color: #d4a84b;">${data.lead_phone}</strong> at your scheduled time.</p>
                    
                    <div style="background: rgba(212,168,75,0.1); border-left: 3px solid #d4a84b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="color: #d4a84b; margin: 0 0 15px; font-size: 18px;">What to Expect</h3>
                        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px; color: #ccc;"><strong style="color: #fff;">Our First Call</strong> is all about getting to know <em>you</em>. I want to understand your life, your family, your goals, what keeps you up at night, and what legacy you want to leave behind. This isn't a sales pitch — it's a conversation to truly understand your unique situation and what matters most to you.</p>
                        <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #ccc;"><strong style="color: #fff;">Our Second Call</strong> is where I'll present customized protection strategies tailored specifically to your risks, budget, lifestyle, and protection needs. Everything I recommend will be based on what we discussed in our first conversation — because cookie-cutter solutions don't protect real families.</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">There's no pressure, no obligation, and no awkward sales tactics. Just an honest conversation about protecting what you've built.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">If you have any questions before our call, feel free to reply to this email.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Looking forward to speaking with you,</p>
                    <p style="font-size: 18px; color: #d4a84b; font-weight: bold; margin: 5px 0;">Killyan Green</p>
                    <p style="font-size: 14px; color: #999; margin: 0;">Founder, Liquid Legacy Financial</p>
                    <p style="font-size: 14px; color: #999; margin: 5px 0 0;"><a href="mailto:kgreen@liquidlegacyfinancial.com" style="color: #d4a84b; text-decoration: none;">kgreen@liquidlegacyfinancial.com</a></p>
                </div>
                
                <div style="background: #0a0a0a; padding: 20px; text-align: center;">
                    <p style="color: #666; margin: 0; font-size: 12px;">Need to reschedule? No problem — just reply to this email.</p>
                </div>
            </div>
        `;

        await emailTransporter.sendMail({
            from: `"Killyan Green - Liquid Legacy Financial" <${process.env.EMAIL_USER}>`,
            to: data.lead_email,
            subject: `Confirmed: Your Call with Killyan - ${formattedDate}`,
            html: confirmationHtml
        });

        console.log('Confirmation email sent to lead');

        // Also save booking to Google Sheets
        try {
            const authClient = await getAuthenticatedClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });

            const timestamp = new Date().toISOString();
            const row = [
                timestamp,
                data.lead_first_name || '',
                data.lead_last_name || '',
                data.lead_email || '',
                data.lead_phone || '',
                data.lead_state || '',
                data.lead_state_other || '',
                data.lead_age || '',
                data.primary_focus || '',
                data.employment_type || '',
                data.occupation || '',
                data.income_range || '',
                data.income_stability || '',
                data.has_partner || '',
                data.partner_works || '',
                data.partner_income_sufficiency || '',
                data.has_kids || '',
                data.kids_ages || '',
                data.kids_expenses || '',
                data.other_dependents || '',
                data.home_status || '',
                data.mortgage_balance || '',
                data.monthly_expenses || '',
                data.debt_types || '',
                data.emergency_fund || '',
                data.biggest_risk || '',
                data.protection_priority || '',
                data.has_life_insurance || '',
                data.why_no_insurance || '',
                data.current_coverage_amount || '',
                data.current_policy_types || '',
                data.coverage_confidence || '',
                data.preference_style || '',
                data.goal_type || '',
                data.time_horizon || '',
                data.funding_commitment || '',
                data.monthly_budget || '',
                data.nicotine_use || '',
                data.health_status || '',
                data.health_conditions || '',
                data.health_other || '',
                data.timeline || '',
                data.trigger_reason || '',
                data.sms_consent || '',
                data.decision_role || '',
                data.trade_type || '',
                data.business_name || '',
                data.years_in_business || '',
                data.team_size || '',
                data.annual_revenue_range || '',
                data.tax_pain_level || '',
                data.lead_score || '',
                data.lead_tier || '',
                data.booking_type || data.session_type || '',
                data.chat_completion_type || '',
                data.notes || '',
                data.utm_source || '',
                data.utm_medium || '',
                data.utm_campaign || '',
                data.utm_content || '',
                data.utm_term || '',
                data.landing_page || '',
                data.referrer || '',
                data.session_duration || '',
                `BOOKED: ${formattedDateTime}`
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Sheet1!A:BM',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [row] }
            });

            console.log('Booking saved to Google Sheets');
        } catch (sheetError) {
            console.error('Error saving to sheets (booking still confirmed):', sheetError.message);
        }

        res.json({ success: true, message: 'Appointment booked successfully' });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, error: 'Failed to book appointment', details: error.message });
    }
});

// ============================================================
// ENDPOINT 3: Contact form submission
// ============================================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message, coverages } = req.body;
        const firstName = name.split(' ')[0];
        console.log('Contact form submission from:', name, email);

        // Email to Killyan
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0a0a; padding: 30px; text-align: center;">
                    <h1 style="color: #d4a84b; margin: 0;">New Contact Form Submission</h1>
                </div>
                
                <div style="background: #1a1a1a; padding: 30px; color: #ffffff;">
                    <h3 style="color: #d4a84b;">Contact Details</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #d4a84b;">${email}</a></p>
                    ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #d4a84b;">${phone}</a></p>` : ''}
                    
                    ${coverages ? `
                    <h3 style="color: #d4a84b; margin-top: 20px;">Interested In</h3>
                    <p style="background: #2d2d2d; padding: 15px; border-radius: 8px;">${coverages}</p>
                    ` : ''}
                    
                    ${message ? `
                    <h3 style="color: #d4a84b; margin-top: 20px;">Message</h3>
                    <p style="background: #2d2d2d; padding: 15px; border-radius: 8px; border-left: 3px solid #d4a84b;">${message}</p>
                    ` : ''}
                </div>
                
                <div style="background: #0a0a0a; padding: 20px; text-align: center;">
                    <p style="color: #666; margin: 0; font-size: 12px;">Liquid Legacy Financial - Contact Form</p>
                </div>
            </div>
        `;

        await emailTransporter.sendMail({
            from: `"Liquid Legacy Website" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `📬 New Contact: ${name}${coverages ? ' - ' + coverages.split(',')[0] : ''}`,
            html: emailHtml
        });

        console.log('Contact form email sent to owner');

        // Auto-reply to the person who filled out the form
        const autoReplyHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0a0a; padding: 30px; text-align: center;">
                    <h1 style="color: #d4a84b; margin: 0;">Thanks for Reaching Out!</h1>
                </div>
                
                <div style="background: #1a1a1a; padding: 30px; color: #ffffff;">
                    <p style="font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">Thanks for getting in touch — I appreciate you taking the time to reach out!</p>
                    
                    <p style="font-size: 16px; line-height: 1.6;">I've received your message and will personally get back to you within 24 hours.</p>
                    
                    <div style="background: rgba(212,168,75,0.1); border-left: 3px solid #d4a84b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="color: #d4a84b; margin: 0 0 12px; font-size: 17px;">Want to skip the wait?</h3>
                        <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #ccc;">If you'd like to chat sooner, feel free to book a quick intro call directly on my calendar. It's just a casual 15-minute conversation to see if I can help — no pressure, no sales pitch.</p>
                        <a href="https://liquidlegacyfinancial.com/book.html" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #d4a84b 0%, #b8923f 100%); color: #0a0a0a; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Book a Quick Call →</a>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6;">In the meantime, if you have any questions, just reply to this email and I'll get back to you as soon as I can.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Talk soon,</p>
                    <p style="font-size: 18px; color: #d4a84b; font-weight: bold; margin: 5px 0;">Killyan Green</p>
                    <p style="font-size: 14px; color: #999; margin: 0;">Founder, Liquid Legacy Financial</p>
                    <p style="font-size: 14px; color: #999; margin: 5px 0 0;"><a href="mailto:kgreen@liquidlegacyfinancial.com" style="color: #d4a84b; text-decoration: none;">kgreen@liquidlegacyfinancial.com</a></p>
                </div>
                
                <div style="background: #0a0a0a; padding: 20px; text-align: center;">
                    <p style="color: #666; margin: 0; font-size: 12px;">Liquid Legacy Financial • Protecting What Matters Most</p>
                </div>
            </div>
        `;

        await emailTransporter.sendMail({
            from: `"Killyan Green - Liquid Legacy Financial" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Got your message, ${firstName}!`,
            html: autoReplyHtml
        });

        console.log('Auto-reply sent to contact');
        res.json({ success: true, message: 'Message sent successfully' });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('🚀 Liquid Legacy Financial Server');
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Sheets endpoint: /api/sheets-submit`);
    console.log(`✓ Booking endpoint: /api/book-appointment`);
    console.log(`✓ Contact endpoint: /api/contact`);
    console.log(`✓ Google Sheet ID: ${GOOGLE_SHEET_ID}`);
    console.log('===========================================');
});
