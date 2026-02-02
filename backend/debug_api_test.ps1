$ErrorActionPreference='Stop'
Write-Output "=== API TEST START ==="
$regBody = @{username='api_debug_run'; password='password123'} | ConvertTo-Json
$reg = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/register' -Method Post -ContentType 'application/json' -Body $regBody
$token = $reg.token
Write-Output "TOKEN_START"
Write-Output $token
Write-Output "TOKEN_END"
$clientBody = @{name='APIDebugClient'; email='apidbg@example.com'} | ConvertTo-Json
$client = Invoke-RestMethod -Uri 'http://localhost:5000/api/clients' -Method Post -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"} -Body $clientBody
Write-Output "CLIENT_START"
Write-Output $client.id
Write-Output "CLIENT_END"
$schedule = (Get-Date).AddMinutes(15).ToString('o')
$remBody = @{message='api debug delete'; sendVia='email'; scheduleAt=$schedule; clients=@($client.id)} | ConvertTo-Json
Write-Output "REM_PAYLOAD_START"
Write-Output $remBody
Write-Output "REM_PAYLOAD_END"
$rem = Invoke-RestMethod -Uri 'http://localhost:5000/api/reminders' -Method Post -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"} -Body $remBody
Write-Output "REM_CREATED_START"
Write-Output $rem.id
Write-Output "REM_CREATED_END"
try {
  $del = Invoke-RestMethod -Uri "http://localhost:5000/api/reminders/$($rem.id)" -Method Delete -Headers @{Authorization = "Bearer $token"}
  Write-Output "DELETE_OK"
  Write-Output ($del | ConvertTo-Json -Depth 3)
} catch {
  Write-Output "DELETE_FAILED"
  $_ | Format-List * -Force
}
Write-Output "=== API TEST END ==="
