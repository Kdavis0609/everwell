#!/bin/bash

# EverWell Domain Setup Script for www.everwellhealth.us
# This script helps configure environment variables and settings for the new domain

echo "🌐 EverWell Domain Setup for www.everwellhealth.us"
echo "=================================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
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
EOF
    echo "✅ Created .env.local file"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🔧 Configuration Steps:"
echo "======================="
echo ""
echo "1. 📧 Supabase Configuration:"
echo "   - Go to your Supabase project dashboard"
echo "   - Navigate to Authentication → URL Configuration"
echo "   - Set Site URL to: https://www.everwellhealth.us"
echo "   - Add redirect URLs:"
echo "     * https://www.everwellhealth.us/auth/callback"
echo "     * https://www.everwellhealth.us/auth/callback?type=recovery"
echo "     * http://localhost:3000/auth/callback (for development)"
echo "     * http://localhost:3000/auth/callback?type=recovery (for development)"
echo ""
echo "2. 🚀 Vercel Configuration:"
echo "   - Go to your Vercel project settings"
echo "   - Navigate to Domains and add: www.everwellhealth.us"
echo "   - Set environment variables:"
echo "     * NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us"
echo "     * Add all other required environment variables"
echo ""
echo "3. 📧 Email Configuration (if using SendGrid):"
echo "   - Go to SendGrid → Settings → Sender Authentication"
echo "   - Authenticate your domain: everwellhealth.us"
echo "   - Update Supabase SMTP settings with verified sender"
echo ""
echo "4. 🔒 DNS Configuration:"
echo "   - Add A record: www.everwellhealth.us → <Your hosting IP>"
echo "   - Add CNAME record: everwellhealth.us → www.everwellhealth.us"
echo "   - Add SPF record: v=spf1 include:sendgrid.net ~all"
echo "   - Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@everwellhealth.us"
echo ""
echo "5. 🧪 Testing:"
echo "   - Test authentication at: https://www.everwellhealth.us/login"
echo "   - Test email delivery with magic links"
echo "   - Verify all API endpoints work correctly"
echo ""
echo "📚 For detailed instructions, see: DOMAIN_SETUP.md"
echo ""
echo "✅ Setup script completed!"
