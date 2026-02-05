# Apply the pause check fix to routes.ts
# Run this script from the project root

$routesFile = "server\routes.ts"
$content = Get-Content $routesFile -Raw

# Replace the shouldAgentRespond logic
$oldPattern = 'const shouldAgentRespond = updatedConversation\?\.isAgentActive && \(\s+wasJustActivated \|\|  \/\/ Fresh handoff = agent initiates\s+sender === ''scammer''  \/\/ Scammer message = agent responds\s+\);'

$newCode = @'
const shouldAgentRespond = updatedConversation?.isAgentActive && 
      !session.agent_state.is_paused &&  // FIX: Check if paused
      (
      wasJustActivated ||  // Fresh handoff = agent initiates
      sender === 'scammer'  // Scammer message = agent responds
    );
'@

if ($content -match $oldPattern) {
    $content = $content -replace $oldPattern, $newCode
    Set-Content -Path $routesFile -Value $content
    Write-Host "✅ Successfully applied pause check to routes.ts" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not find the exact pattern. Please apply manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "In server/routes.ts around line 322, change:" -ForegroundColor Cyan
    Write-Host "  const shouldAgentRespond = updatedConversation?.isAgentActive && (" -ForegroundColor Gray
    Write-Host "    wasJustActivated ||" -ForegroundColor Gray
    Write-Host "    sender === 'scammer'" -ForegroundColor Gray  
    Write-Host "  );" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To:" -ForegroundColor Cyan
    Write-Host "  const shouldAgentRespond = updatedConversation?.isAgentActive &&" -ForegroundColor Gray
    Write-Host "    !session.agent_state.is_paused &&  // ← ADD THIS LINE" -ForegroundColor Green
    Write-Host "    (" -ForegroundColor Gray
    Write-Host "    wasJustActivated ||" -ForegroundColor Gray
    Write-Host "    sender === 'scammer'" -ForegroundColor Gray
    Write-Host "  );" -ForegroundColor Gray
}
