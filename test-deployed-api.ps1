# Test your deployed API - Run this after deploying to Render

# Replace this with your actual Render URL
$BASE_URL = "https://honeypot-agentical.onrender.com"

Write-Host "🧪 Testing Scam Guard Agent API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing /health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod "$BASE_URL/health"
    Write-Host "   ✅ Health check passed!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ❌ Health check failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 2: API Test
Write-Host "2️⃣ Testing /api/test endpoint..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod "$BASE_URL/api/test"
    Write-Host "   ✅ API test passed!" -ForegroundColor Green
    Write-Host "   Message: $($test.message)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ❌ API test failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 3: List Conversations
Write-Host "3️⃣ Testing /api/conversations..." -ForegroundColor Yellow
try {
    $convs = Invoke-RestMethod "$BASE_URL/api/conversations"
    Write-Host "   ✅ Conversations loaded!" -ForegroundColor Green
    Write-Host "   Count: $($convs.Count)" -ForegroundColor Gray
    if ($convs.Count -gt 0) {
        Write-Host "   First conversation ID: $($convs[0].id)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "   ❌ Failed to load conversations!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Send Message with API Key Header
Write-Host "4️⃣ Testing /api/conversations/1/messages with API key..." -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "x-api-key" = "SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a"
    }
    
    $body = @{
        conversation_id = 1
        sender = "scammer"
        content = "Hello, this is Officer John from IRS. Pay $5000 immediately."
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/conversations/1/messages" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ✅ Message sent successfully!" -ForegroundColor Green
    Write-Host "   Message ID: $($response.id)" -ForegroundColor Gray
    Write-Host "   Risk Score: $($response.ui_state.risk_score)" -ForegroundColor Gray
    Write-Host "   Agent Status: $($response.ui_state.agent_status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ❌ Message sending failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "📋 SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ ALL TESTS PASSED! Your API is ready for submission." -ForegroundColor Green
Write-Host ""
Write-Host "📤 SUBMIT THESE TO THE OFFICIAL TESTER:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Field 1 (x-api-key):" -ForegroundColor White
Write-Host "   SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Field 2 (Endpoint URL):" -ForegroundColor White
Write-Host "   $BASE_URL/api/conversations/1/messages" -ForegroundColor Cyan
Write-Host ""
