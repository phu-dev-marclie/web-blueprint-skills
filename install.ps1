# Installs every skill in .\skills into ~/.agents/skills and links it into ~/.claude/skills.
$ErrorActionPreference = 'Stop'
$src    = Join-Path $PSScriptRoot 'skills'
$agents = Join-Path $HOME '.agents\skills'
$claude = Join-Path $HOME '.claude\skills'
New-Item -ItemType Directory -Force -Path $agents, $claude | Out-Null

foreach ($skill in Get-ChildItem -Directory $src) {
    $target = Join-Path $agents $skill.Name
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Recurse $skill.FullName $target

    $link = Join-Path $claude $skill.Name
    $item = Get-Item $link -Force -ErrorAction SilentlyContinue
    if ($item -and -not $item.LinkType) {
        Write-Warning "$link is a real folder; left unchanged (remove it and rerun to link)."
        continue
    }
    if ($item) { $item.Delete() }
    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
    Write-Host "installed $($skill.Name)"
}
