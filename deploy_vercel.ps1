param(
    [Parameter(Mandatory=$false)]
    [string]$VercelToken = ""
)

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot

if (-not $VercelToken) {
    if ($env:VERCEL_TOKEN) {
        $VercelToken = $env:VERCEL_TOKEN
    } else {
        Write-Host "=================================================" -ForegroundColor Yellow
        Write-Host "KUNCI / TOKEN VERCEL DIBUTUHKAN:" -ForegroundColor Yellow
        Write-Host "1. Buka https://vercel.com/account/tokens di browser" -ForegroundColor White
        Write-Host "2. Klik 'Create Token', beri nama 'aktipiti-kompozer'" -ForegroundColor White
        Write-Host "3. Jalankan perintah ini:" -ForegroundColor Cyan
        Write-Host "   .\deploy_vercel.ps1 -VercelToken 'TOKEN_ANDA'" -ForegroundColor Cyan
        Write-Host "=================================================" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "[DEPLOY] Aktipiti Kompozer Web ke Vercel" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

$excluded = @("server.ps1", "deploy_vercel.ps1", "deploy_vercel.mjs", "*.zip", ".git*", ".vercel*", "graphify-out*", "preview_verified.png")
$allFiles = Get-ChildItem -Path $projectDir -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($projectDir.Length).TrimStart('\', '/')
    $isExcluded = $false
    foreach ($ex in $excluded) {
        if ($rel -like $ex -or $_.Name -like $ex) { $isExcluded = $true; break }
    }
    -not $isExcluded
}

Write-Host ("[INFO] Mempersiapkan " + $allFiles.Count + " file...") -ForegroundColor Yellow

$deploymentFiles = @()
$sha1 = [System.Security.Cryptography.SHA1]::Create()

foreach ($file in $allFiles) {
    $relPath = $file.FullName.Substring($projectDir.Length).TrimStart('\', '/').Replace('\', '/')
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $hashBytes = $sha1.ComputeHash($bytes)
    $hashHex = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
    $fileSize = $bytes.Length

    Write-Host ("[UPLOAD] " + $relPath + " (" + $fileSize + " B)") -ForegroundColor Gray

    $uploadHeaders = @{
        "Authorization"   = "Bearer " + $VercelToken
        "x-vercel-digest" = $hashHex
        "Content-Type"    = "application/octet-stream"
    }

    try {
        $null = Invoke-RestMethod -Uri "https://api.vercel.com/v2/now/files" -Method Post -Headers $uploadHeaders -Body $bytes
    } catch {
        $errMsg = $_.Exception.Message
        if ($_.ErrorDetails) {
            $errMsg = $_.ErrorDetails.Message
        } elseif ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $errMsg = $reader.ReadToEnd()
                }
            } catch {}
        }
        Write-Warning ("[WARN] Gagal upload " + $relPath + ": " + $errMsg)
    }

    $deploymentFiles += @{
        file = $relPath
        sha  = $hashHex
        size = $fileSize
    }
}

Write-Host "[INFO] Semua file diunggah. Menginisiasi deployment Vercel..." -ForegroundColor Cyan

$deployPayload = @{
    name = "aktipiti-kompozer"
    target = "production"
    files = $deploymentFiles
    projectSettings = @{
        framework = $null
    }
} | ConvertTo-Json -Depth 5

$headersDeploy = @{
    "Authorization" = "Bearer " + $VercelToken
    "Content-Type"  = "application/json"
}

try {
    $deployResp = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" -Method Post -Headers $headersDeploy -Body $deployPayload
    $url = $deployResp.url
    $alias = $deployResp.alias
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "[SUCCESS] DEPLOY BERHASIL KE VERCEL!" -ForegroundColor Green
    Write-Host ("[URL] https://" + $url) -ForegroundColor Yellow
    if ($alias -and $alias.Count -gt 0) {
        Write-Host ("[ALIAS] https://" + $alias[0]) -ForegroundColor Cyan
    }
    Write-Host "=================================================" -ForegroundColor Green
} catch {
    $errMsg = $_.Exception.Message
    if ($_.ErrorDetails) {
        $errMsg = $_.ErrorDetails.Message
    } elseif ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $errMsg = $reader.ReadToEnd()
            }
        } catch {}
    }
    Write-Error ("[ERROR] Deployment gagal: " + $errMsg)
}
