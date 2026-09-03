param([string]$Path)
$tokens = $null
$errs = $null
[System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errs) | Out-Null
if ($errs.Count -gt 0) {
    foreach ($e in $errs) {
        Write-Host ("PARSE ERROR line " + $e.Extent.StartLineNumber + ": " + $e.Message)
    }
    exit 1
} else {
    Write-Host "PARSES CLEAN"
}
