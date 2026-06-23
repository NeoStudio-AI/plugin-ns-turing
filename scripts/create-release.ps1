$token = (echo "protocol=https`nhost=github.com" | git credential fill 2>$null | Select-String "password=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value })
$bodyRaw = Get-Content "f:\01-AiProjects\12-AIBuilder\plugin_NS_TURING\scripts\release-body.md" -Raw -Encoding UTF8
$payload = @{ tag_name="v0.2.0"; name="v0.2.0 - React + Spectrum 重构"; body=$bodyRaw; draft=$false; prerelease=$false } | ConvertTo-Json -Depth 10
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("NeoStudio-AI:$token"))
try {
    $result = Invoke-RestMethod -Uri "https://api.github.com/repos/NeoStudio-AI/plugin-ns-turing/releases" -Method Post -Headers @{Authorization="Basic $base64Auth"; Accept="application/vnd.github+json"; "X-GitHub-Api-Version"="2022-11-28"} -ContentType "application/json" -Body $payload
    Write-Output "SUCCESS: $($result.html_url)"
} catch {
    Write-Output "FAILED: $_"
}
