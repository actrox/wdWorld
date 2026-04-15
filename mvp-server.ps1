# Minimal static file server for the browser MVP.
# This avoids file:// module loading issues on Windows.

param(
  [int]$Port = 4173
)

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$webRoot = Resolve-Path ".\\mvp"

$mimeTypes = @{
  ".css" = "text/css; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".txt" = "text/plain; charset=utf-8"
}

try {
  $listener.Start()
  Write-Host "VVD World Local MVP server started at http://127.0.0.1:$Port/"

  while ($listener.IsListening) {
    $context = $null

    try {
      $context = $listener.GetContext()
      $requestPath = [System.Uri]::UnescapeDataString(
        $context.Request.Url.AbsolutePath.TrimStart("/")
      )

      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $targetPath = Join-Path $webRoot $requestPath
      $fullTargetPath = [System.IO.Path]::GetFullPath($targetPath)
      $fullWebRoot = [System.IO.Path]::GetFullPath($webRoot)

      if (-not $fullTargetPath.StartsWith($fullWebRoot)) {
        $context.Response.StatusCode = 403
        $context.Response.Close()
        continue
      }

      if (-not (Test-Path $targetPath -PathType Leaf)) {
        $context.Response.StatusCode = 404
        $context.Response.Close()
        continue
      }

      $extension = [System.IO.Path]::GetExtension($targetPath).ToLowerInvariant()
      $context.Response.ContentType = $mimeTypes[$extension]

      if (-not $context.Response.ContentType) {
        $context.Response.ContentType = "application/octet-stream"
      }

      $bytes = [System.IO.File]::ReadAllBytes($targetPath)
      $context.Response.ContentLength64 = $bytes.Length

      if ($context.Request.HttpMethod -eq "HEAD") {
        $context.Response.OutputStream.Close()
        continue
      }

      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.OutputStream.Close()
    } catch {
      if ($context -and $context.Response) {
        $context.Response.StatusCode = 500
        $context.Response.Close()
      }
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }

  $listener.Close()
}
