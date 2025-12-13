// server.js - Node.js server for Google Sheets integration
// Liquid Legacy Financial Chatbot Backend

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors()); // Allow requests from your Squarespace site
app.use(express.json());

// Google Sheets configuration - reading directly from JSON file
let credentials;
try {
    credentials = require('./liquid-legacy-chatbot-4c90d5ba6bd3.json');
} catch (e) {
    console.error('Could not load credentials file:', e.message);
}

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1L0lhvXC1OPLjwsTsKiiTTh1g7ZSq1NmNuN2UYfPDEJI';

// Initialize Google Sheets API client with proper authentication
async function getAuthenticatedClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth.getClient();
}

// Health check endpoint to verify server is running
app.get('/', (req, res) => {
    res.json({ 
        status: 'Liquid Legacy Financial Chatbot Server is running!',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        service: 'Google Sheets Integration',
        sheetId: GOOGLE_SHEET_ID
    });
});

// Main endpoint to receive chatbot data and write to Google Sheets
app.post('/api/sheets-submit', async (req, res) => {
    try {
        const leadData = req.body;
        
        console.log('===========================================');
        console.log('Received lead data at:', new Date().toISOString());
        console.log('Lead name:', leadData.firstName);
        console.log('Lead email:', leadData.email);
        console.log('===========================================');
        
        // Get authenticated client
        const authClient = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        // Format the data as a row for the spreadsheet
        const timestamp = new Date().toISOString();
        const row = [
            timestamp,                                    // A: Timestamp
            leadData.firstName || '',                     // B: First Name
            leadData.email || '',                         // C: Email
            leadData.phone || '',                         // D: Phone
            leadData.age || '',                           // E: Age
            leadData.relationshipStatus || '',            // F: Relationship Status
            leadData.hasKids || '',                       // G: Has Kids
            leadData.numberOfKids || '',                  // H: Number of Kids
            leadData.housingStatus || '',                 // I: Housing Status
            leadData.futurePlans || '',                   // J: Future Plans
            leadData.occupation || '',                    // K: Occupation
            leadData.employmentType || '',                // L: Employment Type
            leadData.workDuration || '',                  // M: Work Duration
            leadData.monthlyIncome || '',                 // N: Monthly Income
            leadData.sideIncome || '',                    // O: Side Income
            leadData.incomeStability || '',               // P: Income Stability
            leadData.dependents || '',                    // Q: Dependents
            leadData.financialImpact || '',               // R: Financial Impact
            leadData.responsibilityFeeling || '',         // S: Responsibility Feeling
            leadData.hasLifeInsurance || '',              // T: Has Life Insurance
            leadData.currentCoverage || '',               // U: Current Coverage
            leadData.savings || '',                       // V: Savings
            leadData.hasDisability || '',                 // W: Has Disability
            leadData.hadReview || '',                     // X: Had Review
            leadData.financialGoals || '',                // Y: Financial Goals
            leadData.retirementAge || '',                 // Z: Retirement Age
            leadData.legacyImportance || '',              // AA: Legacy Importance
            leadData.riskPreference || '',                // AB: Risk Preference
            leadData.accessImportance || '',              // AC: Access Importance
            leadData.productComplexity || '',             // AD: Product Complexity
            leadData.moneySystem || '',                   // AE: Money System
            leadData.currentSaving || '',                 // AF: Current Saving
            leadData.debtSituation || '',                 // AG: Debt Situation
            leadData.financialDiscipline || '',           // AH: Financial Discipline
            leadData.livingBenefitsAwareness || '',       // AI: Living Benefits Awareness
            leadData.overallHealth || '',                 // AJ: Overall Health
            leadData.majorDiagnoses || '',                // AK: Major Diagnoses
            leadData.healthDetails || '',                 // AL: Health Details
            leadData.smokingStatus || '',                 // AM: Smoking Status
            leadData.drivingHistory || '',                // AN: Driving History
            leadData.leadScore || '',                     // AO: Lead Score
            leadData.productRecommendations || '',        // AP: Product Recommendations
            leadData.source || ''                         // AQ: Source URL
        ];
        
        // Append the row to the Google Sheet
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Sheet1!A:AQ',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [row]
            }
        });
        
        console.log('Successfully wrote to Google Sheets');
        console.log('Updated range:', response.data.updates.updatedRange);
        
        res.json({ 
            success: true, 
            message: 'Lead data saved successfully',
            leadScore: leadData.leadScore,
            recommendations: leadData.productRecommendations
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

// Start the server
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('🚀 Liquid Legacy Financial Chatbot Server');
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Google Sheets integration endpoint: /api/sheets-submit`);
    console.log(`✓ Using Google Sheet ID: ${GOOGLE_SHEET_ID}`);
    console.log('===========================================');
});
