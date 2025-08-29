# EverWell Domain Setup Script for www.everwellhealth.us
# This script helps configure environment variables and settings for the new domain

Write-Host "EverWell Domain Setup for www.everwellhealth.us" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    
    $envContent = @"
# EverWell Environment Variables
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for local development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Configuration (if using SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>

# AI Insights (if enabled)
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_secure_random_string_here
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "Created .env.local file" -ForegroundColor Green
} else {
    Write-Host ".env.local already exists" -ForegroundColor Blue
}

Write-Host ""
Write-Host "Configuration Steps:" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Supabase Configuration:" -ForegroundColor White
Write-Host "   - Go to your Supabase project dashboard" -ForegroundColor Gray
Write-Host "   - Navigate to Authentication -> URL Configuration" -ForegroundColor Gray
Write-Host "   - Set Site URL to: https://www.everwellhealth.us" -ForegroundColor Gray
Write-Host "   - Add redirect URLs:" -ForegroundColor Gray
Write-Host "     * https://www.everwellhealth.us/auth/callback" -ForegroundColor Gray
Write-Host "     * https://www.everwellhealth.us/auth/callback?type=recovery" -ForegroundColor Gray
Write-Host "     * http://localhost:3000/auth/callback (for development)" -ForegroundColor Gray
Write-Host "     * http://localhost:3000/auth/callback?type=recovery (for development)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Vercel Configuration:" -ForegroundColor White
Write-Host "   - Go to your Vercel project settings" -ForegroundColor Gray
Write-Host "   - Navigate to Domains and add: www.everwellhealth.us" -ForegroundColor Gray
Write-Host "   - Set environment variables:" -ForegroundColor Gray
Write-Host "     * NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us" -ForegroundColor Gray
Write-Host "     * Add all other required environment variables" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Email Configuration (if using SendGrid):" -ForegroundColor White
Write-Host "   - Go to SendGrid -> Settings -> Sender Authentication" -ForegroundColor Gray
Write-Host "   - Authenticate your domain: everwellhealth.us" -ForegroundColor Gray
Write-Host "   - Update Supabase SMTP settings with verified sender" -ForegroundColor Gray
Write-Host ""
Write-Host "4. DNS Configuration:" -ForegroundColor White
Write-Host "   - Add A record: www.everwellhealth.us -> <Your hosting IP>" -ForegroundColor Gray
Write-Host "   - Add CNAME record: everwellhealth.us -> www.everwellhealth.us" -ForegroundColor Gray
Write-Host "   - Add SPF record: v=spf1 include:sendgrid.net ~all" -ForegroundColor Gray
Write-Host "   - Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@everwellhealth.us" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Testing:" -ForegroundColor White
Write-Host "   - Test authentication at: https://www.everwellhealth.us/login" -ForegroundColor Gray
Write-Host "   - Test email delivery with magic links" -ForegroundColor Gray
Write-Host "   - Verify all API endpoints work correctly" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see: DOMAIN_SETUP.md" -ForegroundColor Blue
Write-Host ""
Write-Host "Setup script completed!" -ForegroundColor Green
