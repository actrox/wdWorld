# Encoding audit for text files in this project.
# Checks:
# 1. repeated UTF-8 BOM markers
# 2. common mojibake fragments
# 3. unreadable UTF-8 files

param(
  [string]$Root = "."
)

$textExtensions = @(
  ".md", ".html", ".css", ".js", ".json", ".yaml", ".yml", ".ps1", ".bat"
)

$mojibakePatterns = @(
  [string][char]0xFFFD
)

function Get-BomCount {
  param([byte[]]$Bytes)

  $count = 0

  for ($index = 0; $index -le $Bytes.Length - 3; $index++) {
    if ($Bytes[$index] -eq 239 -and $Bytes[$index + 1] -eq 187 -and $Bytes[$index + 2] -eq 191) {
      $count++
    }
  }

  return $count
}

function Get-MojibakeHits {
  param([string]$Text)

  $hits = @()

  foreach ($pattern in $mojibakePatterns) {
    if ($Text.Contains($pattern)) {
      $hits += $pattern
    }
  }

  return $hits
}

$problems = @()

Get-ChildItem -Path $Root -Recurse -File |
  Where-Object { $textExtensions -contains $_.Extension.ToLowerInvariant() } |
  ForEach-Object {
    $path = $_.FullName

    try {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
      $bomCount = Get-BomCount -Bytes $bytes
      $hits = Get-MojibakeHits -Text $text

      if ($bomCount -gt 1 -or $hits.Count -gt 0) {
        $problems += [PSCustomObject]@{
          Path = $path
          BomCount = $bomCount
          MojibakeHits = ($hits -join ", ")
        }
      }
    } catch {
      $problems += [PSCustomObject]@{
        Path = $path
        BomCount = "read-error"
        MojibakeHits = $_.Exception.Message
      }
    }
  }

if ($problems.Count -eq 0) {
  Write-Output "Encoding audit passed."
  exit 0
}

Write-Output "Potential encoding problems found:"
$problems | Format-Table -AutoSize
exit 1
