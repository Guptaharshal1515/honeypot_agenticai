# Quick Deployment Test Script
# Replace YOUR-APP-URL with your actual Render URL

$BASE_URL = "https://YOUR-ACTUAL-APP.onrender.com"

Write-Host "Testing deployed API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
Write-Host "   URL: $BASE_URL/health" -ForegroundColor Gray
try {
    $health = Invoke-RestMethod "$BASE_URL/health"
    Write-Host "   ✅ PASSED - Returns JSON" -ForegroundColor Green
    Write-Host "   Response: $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ FAILED - Not JSON or not reachable" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Your server might not be deployed yet!" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Message Endpoint (The one tester uses)
Write-Host "2. Testing message endpoint..." -ForegroundColor Yellow
Write-Host "   URL: $BASE_URL/api/conversations/1/messages" -ForegroundColor Gray
try {
    $headers = @{
        "Content-Type" = "application/json"
        "x-api-key" = "SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a"
    }
    
    $body = @{
        content = "Test from PowerShell"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/conversations/1/messages" `
        -Method Post `
        -Headers $headers `
        -Body $body -ErrorAction Stop
    
    Write-Host "   ✅ PASSED - Returns JSON" -ForegroundColor Green
    Write-Host "   Message ID: $($response.id)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ FAILED" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 This is likely what the official tester is hitting!" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 SUBMIT TO OFFICIAL TESTER:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Field 1 (x-api-key):" -ForegroundColor White
Write-Host "SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" -ForegroundColor Yellow
Write-Host ""
Write-Host "Field 2 (Endpoint URL):" -ForegroundColor White
Write-Host "$BASE_URL/api/conversations/1/messages" -ForegroundColor Yellow
Write-Host ""
