# Test Official GUVI Honeypot API Endpoint
# This script tests the exact endpoint format required by the problem statement

Write-Host "🎯 Testing Official GUVI Honeypot API Endpoint" -ForegroundColor Cyan
Write-Host "=" * 60

# Configuration
$LOCAL_URL = "http://localhost:5000/api/honeypot/message"
$DEPLOYED_URL = "https://honeypot-agentical.onrender.com/api/honeypot/message"
$API_KEY = "SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a"

# Test payload (exact format from problem statement)
$testPayload = @{
    sessionId = "test-session-$(Get-Random)"
    message = @{
        sender = "scammer"
        text = "Your bank account will be blocked today. Verify immediately."
        timestamp = [long](Get-Date -UFormat %s) * 1000
    }
    conversationHistory = @()
    metadata = @{
        channel = "SMS"
        language = "English"
        locale = "IN"
    }
} | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "📦 Request Payload:" -ForegroundColor Yellow
Write-Host $testPayload
Write-Host ""

# Test local endpoint
Write-Host "1️⃣ Testing LOCAL endpoint..." -ForegroundColor Green
Write-Host "URL: $LOCAL_URL"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $LOCAL_URL -Method Post `
        -ContentType "application/json" `
        -Headers @{"x-api-key" = $API_KEY} `
        -Body $testPayload `
        -ErrorAction Stop
    
    Write-Host "✅ LOCAL TEST PASSED!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json
    Write-Host ""
} catch {
    Write-Host "❌ LOCAL TEST FAILED!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
    Write-Host ""
    Write-Host "💡 Make sure server is running: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60
Write-Host ""

# Ask if user wants to test deployed endpoint
$testDeployed = Read-Host "Test DEPLOYED endpoint? (y/n)"

if ($testDeployed -eq "y" -or $testDeployed -eq "Y") {
    Write-Host ""
    Write-Host "2️⃣ Testing DEPLOYED endpoint..." -ForegroundColor Green
    Write-Host "URL: $DEPLOYED_URL"
    Write-Host ""
    
    try {
        $response = Invoke-RestMethod -Uri $DEPLOYED_URL -Method Post `
            -ContentType "application/json" `
            -Headers @{"x-api-key" = $API_KEY} `
            -Body $testPayload `
            -ErrorAction Stop `
            -TimeoutSec 30
        
        Write-Host "✅ DEPLOYED TEST PASSED!" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Cyan
        $response | ConvertTo-Json
        Write-Host ""
        Write-Host "🎉 Your API is ready for submission!" -ForegroundColor Green
    } catch {
        Write-Host "❌ DEPLOYED TEST FAILED!" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
        }
        Write-Host ""
        Write-Host "💡 Possible issues:" -ForegroundColor Yellow
        Write-Host "  - Deployment still in progress"
        Write-Host "  - Server not started properly"
        Write-Host "  - Environment variables not set"
        Write-Host "  - Check Render logs for details"
    }
}

Write-Host ""
Write-Host "=" * 60
Write-Host ""

# Test multi-turn conversation
$testMultiTurn = Read-Host "Test multi-turn conversation? (y/n)"

if ($testMultiTurn -eq "y" -or $testMultiTurn -eq "Y") {
    Write-Host ""
    Write-Host "3️⃣ Testing Multi-turn Conversation..." -ForegroundColor Green
    
    $sessionId = "multi-turn-test-$(Get-Random)"
    $conversationHistory = @()
    
    # Message 1
    Write-Host ""
    Write-Host "📨 Turn 1: Initial scam message" -ForegroundColor Cyan
    
    $payload1 = @{
        sessionId = $sessionId
        message = @{
            sender = "scammer"
            text = "Your bank account will be blocked. Pay immediately."
            timestamp = [long](Get-Date -UFormat %s) * 1000
        }
        conversationHistory = $conversationHistory
        metadata = @{ channel = "SMS"; language = "English"; locale = "IN" }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response1 = Invoke-RestMethod -Uri $LOCAL_URL -Method Post `
            -ContentType "application/json" `
            -Headers @{"x-api-key" = $API_KEY} `
            -Body $payload1
        
        Write-Host "Agent: $($response1.reply)" -ForegroundColor Yellow
        
        $conversationHistory += @{
            sender = "scammer"
            text = "Your bank account will be blocked. Pay immediately."
            timestamp = [long](Get-Date -UFormat %s) * 1000
        }
        $conversationHistory += @{
            sender = "user"
            text = $response1.reply
            timestamp = [long](Get-Date -UFormat %s) * 1000
        }
        
        Start-Sleep -Seconds 1
        
        # Message 2
        Write-Host ""
        Write-Host "📨 Turn 2: Scammer reveals UPI ID" -ForegroundColor Cyan
        
        $payload2 = @{
            sessionId = $sessionId
            message = @{
                sender = "scammer"
                text = "Send money to scammer@paytm immediately to avoid suspension."
                timestamp = [long](Get-Date -UFormat %s) * 1000
            }
            conversationHistory = $conversationHistory
            metadata = @{ channel = "SMS"; language = "English"; locale = "IN" }
        } | ConvertTo-Json -Depth 10
        
        $response2 = Invoke-RestMethod -Uri $LOCAL_URL -Method Post `
            -ContentType "application/json" `
            -Headers @{"x-api-key" = $API_KEY} `
            -Body $payload2
        
        Write-Host "Agent: $($response2.reply)" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "✅ Multi-turn conversation test completed!" -ForegroundColor Green
        Write-Host "💡 Check server logs to see intelligence extraction" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Multi-turn test failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60
Write-Host "🎬 Testing Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure local tests pass" 
Write-Host "2. Set GEMINI_API_KEY in .env"
Write-Host "3. Commit and push changes"
Write-Host "4. Add GEMINI_API_KEY to Render environment"
Write-Host "5. Deploy to Render"
Write-Host "6. Test deployed endpoint"
Write-Host "7. UPDATE submission URL to: /api/honeypot/message"
Write-Host ""
