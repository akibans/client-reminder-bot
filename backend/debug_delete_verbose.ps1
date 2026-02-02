$ErrorActionPreference='Stop'
Write-Output "=== VERBOSE DELETE TEST START ==="
$ts = (Get-Date -UFormat %s)
$short = $ts.Substring($ts.Length - 4)
$regBody = @{username=("dbg" + $short); password='password123'} | ConvertTo-Json
$reg = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/register' -Method Post -ContentType 'application/json' -Body $regBody
$token = $reg.token
Write-Output "TOKEN:"
Write-Output $token
$clientBody = @{name='DBGClient'; email='dbgclient@example.com'} | ConvertTo-Json
$client = Invoke-RestMethod -Uri 'http://localhost:5000/api/clients' -Method Post -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"} -Body $clientBody
Write-Output "CLIENT ID: $($client.id)"
$schedule = (Get-Date).AddMinutes(20).ToString('o')
$remBody = @{message='verbose delete test'; sendVia='email'; scheduleAt=$schedule; clients=@($client.id)} | ConvertTo-Json
$rem = Invoke-RestMethod -Uri 'http://localhost:5000/api/reminders' -Method Post -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"} -Body $remBody
Write-Output "REM ID: $($rem.id)"
# perform delete with Invoke-WebRequest and capture response even on 500
$headers = @{ Authorization = "Bearer $token" }
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:5000/api/reminders/$($rem.id)" -Method Delete -Headers $headers -ContentType 'application/json' -ErrorAction Stop
  Write-Output "STATUS: $($resp.StatusCode.Value__)"
  Write-Output "CONTENT:"
  Write-Output $resp.Content
} catch {
  Write-Output "DELETE threw an exception. Attempting to read response body..."
  $err = $_.Exception
  if ($err.Response -ne $null) {
    $stream = $err.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Output "RESPONSE_BODY:" 
    Write-Output $body
  } else {
    Write-Output "No response available on exception. Full exception:" 
    Write-Output $_ | Format-List * -Force
  }
}
Write-Output "=== VERBOSE DELETE TEST END ==="