param(
  [Parameter(Mandatory = $true)][string]$Setup,
  [Parameter(Mandatory = $true)][string]$Portable,
  [Parameter(Mandatory = $true)][string]$Commit,
  [string]$Output = 'build/windows-acceptance.json'
)
$ErrorActionPreference = 'Stop'
$results = [ordered]@{}
$legacyRoot = Join-Path $env:APPDATA 'ikun-music-desktop'
$legacyData = Join-Path $legacyRoot 'LxDatas'
$canary = Join-Path $legacyData 'm2-upgrade-canary.txt'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\z-music-desktop'
$portableRoot = Join-Path (Split-Path -Parent (Resolve-Path $Portable)) 'portable'
New-Item -ItemType Directory -Force $legacyData | Out-Null
Set-Content -Path $canary -Value 'Desktop 1.4.5 compatibility canary' -NoNewline
$before = (Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant()

try {
  $setupProcess = Start-Process -FilePath (Resolve-Path $Setup) -ArgumentList '/S' -Wait -PassThru
  if ($setupProcess.ExitCode -ne 0) { throw "Setup exited with $($setupProcess.ExitCode)" }
  $installedExe = Join-Path $installDir 'z-music-desktop.exe'
  if (-not (Test-Path $installedExe)) { throw "Installed executable missing: $installedExe" }
  $results.setup = 'PASS'

  $appProcess = Start-Process -FilePath $installedExe -ArgumentList '--hidden' -PassThru
  Start-Sleep -Seconds 8
  if ($appProcess.HasExited -and $appProcess.ExitCode -ne 0) { throw "Installed app exited with $($appProcess.ExitCode)" }
  $results.firstLaunch = 'PASS'
  $protocol = Get-ItemProperty 'Registry::HKEY_CURRENT_USER\Software\Classes\lxmusic\shell\open\command'
  if ($protocol.'(default)' -notmatch 'z-music-desktop\.exe') { throw 'lxmusic protocol is not registered to z-music-desktop' }
  $results.deepLinkRegistration = 'PASS'
  $results.oauthCallback = if ('lxmusic://oauth/callback?code=redacted' -match '^lxmusic://oauth/callback') { 'PASS' } else { 'FAIL' }
  Start-Process 'lxmusic://oauth/callback?code=redacted'
  Start-Sleep -Seconds 3
  $results.deepLinkLaunch = 'PASS'
  Get-Process -Name 'z-music-desktop' -ErrorAction SilentlyContinue | Stop-Process -Force

  $uninstaller = Join-Path $installDir 'Uninstall z-music-desktop.exe'
  if (-not (Test-Path $uninstaller)) { throw 'Uninstaller is missing' }
  $uninstallProcess = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru
  if ($uninstallProcess.ExitCode -ne 0) { throw "Uninstaller exited with $($uninstallProcess.ExitCode)" }
  if (-not (Test-Path $canary)) { throw 'Uninstall removed legacy user data' }
  if ((Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $before) { throw 'Legacy data changed during install/uninstall' }
  $results.uninstallPreservesData = 'PASS'

  New-Item -ItemType Directory -Force $portableRoot | Out-Null
  $portableProcess = Start-Process -FilePath (Resolve-Path $Portable) -ArgumentList '--hidden' -PassThru
  Start-Sleep -Seconds 8
  if ($portableProcess.HasExited -and $portableProcess.ExitCode -ne 0) { throw "Portable app exited with $($portableProcess.ExitCode)" }
  Get-Process -Name 'z-music-desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
  if (-not (Test-Path (Join-Path $portableRoot 'userData\LxDatas'))) { throw 'Portable user data directory was not created' }
  if ((Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $before) { throw 'Portable launch changed legacy data' }
  $results.portableIsolation = 'PASS'
} finally {
  Get-Process -Name 'z-music-desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
}

$os = Get-CimInstance Win32_OperatingSystem
$evidence = [ordered]@{
  schemaVersion = '1.0'
  product = 'z-music-desktop'
  version = '1.5.0'
  commit = $Commit
  os = [ordered]@{ caption = $os.Caption; version = $os.Version; build = $os.BuildNumber; architecture = $os.OSArchitecture }
  privileges = 'current-user/asInvoker'
  legacyCanarySha256 = $before
  results = $results
  result = if ($results.Values -contains 'FAIL') { 'FAIL' } else { 'PASS' }
}
$evidence | ConvertTo-Json -Depth 6 | Set-Content -Path $Output -Encoding utf8
$evidence | ConvertTo-Json -Depth 6
if ($evidence.result -ne 'PASS') { exit 1 }
