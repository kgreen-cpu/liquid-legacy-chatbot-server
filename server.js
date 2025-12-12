// server.js - Node.js server for Google Sheets integration
// This server receives chatbot data and writes it to your Google Sheet

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your Squarespace site
app.use(express.json());

// Google Sheets configuration - reading directly from JSON file
const credentials = require('./liquid-legacy-chatbot-4c90d5ba6bd3.json');
const GOOGLE_SHEET_ID = '1L0lhvXC1OPLjwsTsKiiTTh1g7ZSq1NmNuN2UYfPDEJI';

// Initialize Google Sheets API client with proper authentication
async function getAuthenticatedClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth.getClient();
}

// Health check endpoint to verify server is running
app.get('/health', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        service: 'Google Sheets Integration'
    });
});

// Main endpoint to receive chatbot data and write to Google Sheets
app.post('/api/sheets-submit', async (req, res) => {
    try {
        const leadData = req.body;
        
        console.log('Received lead data for:', leadData.email);
        
        // Calculate lead score using the same logic as the chatbot
        const leadScore = calculateLeadScore(leadData);
        
        // Determine product recommendations
        const recommendations = determineProductRecommendations(leadData);
        
        // Format the data as a row for the spreadsheet
        const timestamp = new Date().toISOString();
        const row = [
            timestamp,                                  // Column A: Timestamp
            leadData.firstName,                         // Column B: First Name
            leadData.email,                             // Column C: Email
            leadData.phone,                             // Column D: Phone
            leadData.age,                               // Column E: Age
            leadData.relationshipStatus,                // Column F: Relationship Status
            leadData.numberOfKids || '0',               // Column G: Number of Kids
            leadData.housingStatus,                     // Column H: Housing Status
            leadData.occupation,                        // Column I: Occupation
            leadData.workDuration,                      // Column J: Work Duration
            leadData.employmentType,                    // Column K: Employment Type
            leadData.monthlyIncome,                     // Column L: Monthly Income
            leadData.sideIncome,                        // Column M: Side Income
            leadData.incomeLossImpact,                  // Column N: Income Loss Impact
            leadData.dependents,                        // Column O: Dependents
            leadData.existingCoverage,                  // Column P: Existing Coverage
            leadData.coverageDetails || 'N/A',          // Column Q: Coverage Details
            leadData.livingBenefitsAwareness,           // Column R: Living Benefits Awareness
            leadData.financialGoals || 'Not specified', // Column S: Financial Goals
            leadData.targetRetirementAge || 'Not specified', // Column T: Target Retirement Age
            leadData.riskTolerance || 'Not specified',  // Column U: Risk Tolerance
            leadData.monthlySavings,                    // Column V: Monthly Savings
            leadData.financialDiscipline,               // Column W: Financial Discipline
            leadData.healthStatus,                      // Column X: Health Status
            leadData.tobaccoUse,                        // Column Y: Tobacco Use
            leadData.motivation,                        // Column Z: Motivation
            leadScore,                                  // Column AA: Lead Score
            recommendations.join(', '),                 // Column AB: Recommended Products
            'New Lead',                                 // Column AC: Status
            '',                                         // Column AD: Follow-up Notes
            ''                                          // Column AE: Close Date
        ];

        // Get authenticated client
        const authClient = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // Append the row to the Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Leads!A:AE',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [row]
            }
        });

        console.log('Successfully added lead to Google Sheets');

        // High quality lead alert
        if (leadScore >= 70) {
            console.log(`🔥 HIGH QUALITY LEAD ALERT: ${leadData.firstName} scored ${leadScore} points!`);
        }

        res.json({ 
            success: true,
            leadScore: leadScore,
            recommendations: recommendations,
            message: 'Lead successfully added to Google Sheets'
        });

    } catch (error) {
        console.error('Google Sheets API Error:', error.message);
        console.error('Full error:', error);
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add lead to Google Sheets',
            details: error.message
        });
    }
});

// Calculate lead quality score based on profile
function calculateLeadScore(data) {
    let score = 0;
    
    // Age scoring - your target demographic of 25-40 gets the most points
    const age = parseInt(data.age);
    if (age >= 25 && age <= 40) {
        score += 20;
    } else if (age >= 41 && age <= 50) {
        score += 10;
    }
    
    // Income scoring - higher income means they can afford meaningful coverage
    const income = parseInt(data.monthlyIncome?.replace(/\D/g, '') || 0);
    if (income >= 8000) {
        score += 25;
    } else if (income >= 5000) {
        score += 15;
    } else if (income >= 3000) {
        score += 5;
    }
    
    // Employment type - contractors and business owners are your ideal clients
    if (data.employmentType?.includes('Contractor') || 
        data.employmentType?.includes('Business Owner') || 
        data.employmentType?.includes('Self-employed')) {
        score += 20;
    }
    
    // Family responsibility - people with dependents need protection more urgently
    if (data.relationshipStatus?.includes('Married') || 
        data.relationshipStatus?.includes('parent')) {
        score += 15;
    }
    
    // Each child adds urgency for protection
    const kids = parseInt(data.numberOfKids || 0);
    if (kids > 0) {
        score += 5;
    }
    
    // Homeownership indicates financial stability
    if (data.housingStatus === 'Own my home') {
        score += 10;
    }
    
    // Financial discipline - can they sustain premium payments
    const discipline = parseInt(data.financialDiscipline || 0);
    if (discipline >= 7) {
        score += 10;
    } else if (discipline >= 5) {
        score += 5;
    }
    
    // Living benefits awareness - educated buyers are easier to work with
    if (data.livingBenefitsAwareness?.includes("that's why I'm here")) {
        score += 10;
    }
    
    // Health factors affect insurability and rates
    if (data.healthStatus === 'Excellent') {
        score += 5;
    }
    
    if (data.tobaccoUse === 'No') {
        score += 5;
    }
    
    return score;
}

// Determine which products to recommend based on their profile
function determineProductRecommendations(data) {
    const recommendations = [];
    const age = parseInt(data.age);
    const income = parseInt(data.monthlyIncome?.replace(/\D/g, '') || 0);
    const hasFamily = data.relationshipStatus?.includes('Married') || 
                      data.relationshipStatus?.includes('parent');
    
    // Term Life - basic protection for anyone with dependents
    if (hasFamily || data.dependents) {
        recommendations.push('Term Life');
    }
    
    // IUL - for higher earners who want growth and living benefits
    if (income >= 5000 && age <= 50 && 
        (data.livingBenefitsAwareness?.includes('here') || 
         data.riskTolerance?.includes('growth'))) {
        recommendations.push('Indexed Universal Life (IUL)');
    }
    
    // Whole Life - for those wanting guaranteed stability
    if (data.riskTolerance?.includes('stable') || 
        data.riskTolerance?.includes('Mix')) {
        recommendations.push('Whole Life');
    }
    
    // Annuities - for retirement planning
    if ((age >= 45 || parseInt(data.financialDiscipline || 0) >= 7) && 
        data.financialGoals?.toLowerCase().includes('retirement')) {
        recommendations.push('Annuities');
    }
    
    return recommendations;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Google Sheets integration endpoint: http://localhost:${PORT}/api/sheets-submit`);
    console.log(`✓ Using Google Sheet ID: ${GOOGLE_SHEET_ID}`);
});

module.exports = app;