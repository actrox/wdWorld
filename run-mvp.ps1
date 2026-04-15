# Start the local MVP in a browser.

$port = 4173
$serverUrl = "http://127.0.0.1:$port/"
$serverScriptPath = Resolve-Path ".\\mvp-server.ps1"

function Test-LocalServer {
  param(
    [string]$Url
  )

  try {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "HEAD"
    $request.Timeout = 1000
    $response = $request.GetResponse()
    $response.Close()
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-LocalServer -Url $serverUrl)) {
  Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$serverScriptPath`"",
    "-Port", $port
  ) | Out-Null

  Start-Sleep -Seconds 2
}

Start-Process $serverUrl
