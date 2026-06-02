<#
.SYNOPSIS
    Seed AWS SSM Parameter Store from a local .env file (PowerShell).

.DESCRIPTION
    PowerShell equivalent of ``seed-parameter-store.sh``. Same logic,
    same secret-key list -- useful on Windows operator machines where
    bash (WSL) doesn't see the Windows-installed aws.exe because the
    two have separate PATHs.

    Reads <EnvFile> line by line and creates/updates a parameter at
    <Prefix>/<KEY> for each KEY=VALUE line. Keys in $SecretKeys are
    stored as SecureString (KMS-encrypted with the default aws/ssm
    managed key); the rest as plain String.

    Idempotent -- uses ``put-parameter --overwrite``. Skips blank
    lines and ``#``-prefixed comments.

.PARAMETER EnvFile
    Path to the .env file to upload (required, positional).

.PARAMETER Prefix
    SSM parameter prefix. Default: /quizonline/prod

.PARAMETER Region
    AWS region. Default: eu-west-1

.PARAMETER DryRun
    Print intended operations without calling AWS.

.EXAMPLE
    .\deploy\seed-parameter-store.ps1 .\prod.env -DryRun
    .\deploy\seed-parameter-store.ps1 .\prod.env
    .\deploy\seed-parameter-store.ps1 .\staging.env -Prefix /quizonline/staging
#>
param(
    [Parameter(Mandatory = $true, Position = 0)][string]$EnvFile,
    [string]$Prefix = "/quizonline/prod",
    [string]$Region = "eu-west-1",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Keys stored as SecureString. Anything else is plain String. Keep
# this list in sync with deploy/seed-parameter-store.sh.
$SecretKeys = @(
    "SECRET_KEY",
    "JWT_SIGNING_KEY",
    "DATABASE_URL",
    "EMAIL_HOST_PASSWORD",
    "MS_GRAPH_CLIENT_SECRET",
    "DEEPL_AUTH_KEY",
    "SENTRY_DSN",
    "SENTRY_FRONTEND_DSN"
)

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Error "ENV file '$EnvFile' not found"
    exit 1
}

Write-Host "=== Seeding $Prefix/* from $EnvFile (region=$Region, dry-run=$DryRun) ==="

$count = 0
$skipped = 0

Get-Content -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }

    $eq = $line.IndexOf("=")
    if ($eq -lt 1) {
        Write-Warning "Skipping malformed line: $line"
        $script:skipped++
        return
    }

    $key = $line.Substring(0, $eq)
    $value = $line.Substring($eq + 1)
    # Strip surrounding double or single quotes if present
    if ($value.Length -ge 2) {
        $first = $value[0]; $last = $value[$value.Length - 1]
        if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }
    }

    # Parity with seed-parameter-store.sh: refuse embedded newlines —
    # neither SSM nor the downstream EnvironmentFile / dotenv parse them
    # cleanly, and a well-formed secret never contains one.
    if ($value -match "[`r`n]") {
        Write-Error "Value of $key contains a newline character"
        exit 2
    }

    $type = if ($SecretKeys -contains $key) { "SecureString" } else { "String" }
    $name = "$Prefix/$key"

    if ($DryRun) {
        if ($type -eq "SecureString") {
            Write-Host "  DRY: $name -> $type (value redacted)"
        } else {
            Write-Host "  DRY: $name -> $type = $value"
        }
    } else {
        & aws ssm put-parameter `
            --region $Region `
            --name $name `
            --value $value `
            --type $type `
            --overwrite `
            --output text | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to put $name (aws exit $LASTEXITCODE)"
            exit 1
        }
        Write-Host "  OK : $name ($type)"
    }
    $script:count++
}

Write-Host ""
Write-Host "Done. $count parameter(s) processed, $skipped skipped."
