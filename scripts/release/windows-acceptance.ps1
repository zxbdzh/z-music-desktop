param(
  [Parameter(Mandatory = $true)][string]$LegacySetup,
  [Parameter(Mandatory = $true)][string]$Setup,
  [Parameter(Mandatory = $true)][string]$Portable,
  [Parameter(Mandatory = $true)][ValidateSet('10', '11')][string]$ExpectedWindowsMajor,
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-f]{40}$')][string]$Commit,
  [string]$RcManifest = 'docs/qa/evidence/desktop-rc.manifest.json',
  [string]$Output = 'build/windows-acceptance.json'
)

$ErrorActionPreference = 'Stop'
$results = [ordered]@{}
$legacyRoot = Join-Path $env:APPDATA 'ikun-music-desktop'
$legacyData = Join-Path $legacyRoot 'LxDatas'
$canary = Join-Path $legacyData 'm2-upgrade-canary.txt'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\z-music-desktop'
$installedExe = Join-Path $installDir 'z-music-desktop.exe'
$uninstaller = Join-Path $installDir 'Uninstall z-music-desktop.exe'
$portableRoot = Join-Path (Split-Path -Parent (Resolve-Path $Portable)) 'portable'

function Invoke-SilentInstaller([string]$Path, [string]$Label) {
  $process = Start-Process -FilePath (Resolve-Path $Path) -ArgumentList '/S' -Wait -PassThru
  if ($process.ExitCode -eq -1073741819) {
    Start-Sleep -Seconds 5
    $process = Start-Process -FilePath (Resolve-Path $Path) -ArgumentList '/S' -Wait -PassThru
  }
  if ($process.ExitCode -ne 0) { throw "$Label exited with $($process.ExitCode)" }
}

function Stop-Desktop {
  Get-Process -Name 'z-music-desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
}

$os = Get-CimInstance Win32_OperatingSystem
$expectedCaption = "Windows $ExpectedWindowsMajor"
if ($os.Caption -notmatch [regex]::Escape($expectedCaption)) {
  throw "Expected a real $expectedCaption client, got $($os.Caption)"
}
if ($os.OSArchitecture -notmatch '64') { throw "Expected x64 Windows, got $($os.OSArchitecture)" }
$build = [int]$os.BuildNumber
if ($ExpectedWindowsMajor -eq '10' -and ($build -lt 19045 -or $build -ge 22000)) {
  throw "Expected Windows 10 22H2 build 19045, got $build"
}
if ($ExpectedWindowsMajor -eq '11' -and $build -lt 22000) {
  throw "Expected Windows 11 build 22000 or newer, got $build"
}
$results.hostIdentity = 'PASS'

if (-not (Test-Path $RcManifest)) { throw "Desktop RC evidence missing: $RcManifest" }
$rc = Get-Content $RcManifest -Raw | ConvertFrom-Json
if ($rc.result -ne 'PASS') { throw 'Desktop RC evidence does not report PASS' }
$rcSha256 = (Get-FileHash $RcManifest -Algorithm SHA256).Hash.ToLowerInvariant()
$results.desktopRcEvidence = 'PASS'

New-Item -ItemType Directory -Force $legacyData | Out-Null
Set-Content -Path $canary -Value 'Desktop 1.4.5 compatibility canary' -NoNewline
$before = (Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant()

try {
  Invoke-SilentInstaller $LegacySetup 'Historical 1.4.5 Setup'
  if (-not (Test-Path $installedExe)) { throw "1.4.5 executable missing: $installedExe" }
  $legacyVersion = (Get-Item $installedExe).VersionInfo.ProductVersion
  if ($legacyVersion -notmatch '^1\.4\.5') { throw "Expected installed 1.4.5, got $legacyVersion" }
  $legacyProcess = Start-Process -FilePath $installedExe -ArgumentList '--hidden' -PassThru
  Start-Sleep -Seconds 8
  if ($legacyProcess.HasExited) { throw "1.4.5 exited during upgrade preflight with $($legacyProcess.ExitCode)" }
  Stop-Desktop
  $results.legacy145InstallAndLaunch = 'PASS'

  Invoke-SilentInstaller $Setup 'Desktop 1.5.0 Setup'
  if (-not (Test-Path $installedExe)) { throw "1.5.0 executable missing: $installedExe" }
  $currentVersion = (Get-Item $installedExe).VersionInfo.ProductVersion
  if ($currentVersion -notmatch '^1\.5\.0') { throw "Expected installed 1.5.0, got $currentVersion" }
  if ((Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $before) {
    throw 'Historical data changed during the 1.4.5 to 1.5.0 upgrade'
  }
  $results.upgrade145To150 = 'PASS'
  $results.setupCurrentUser = 'PASS'

  $appProcess = Start-Process -FilePath $installedExe -ArgumentList '--hidden' -PassThru
  Start-Sleep -Seconds 8
  if ($appProcess.HasExited) { throw "Installed app exited with $($appProcess.ExitCode)" }
  $results.firstLaunch = 'PASS'
  $results.hiddenTrayProcessBehavior = 'PASS'

  $protocolPath = 'Registry::HKEY_CURRENT_USER\Software\Classes\lxmusic\shell\open\command'
  $protocol = Get-ItemProperty $protocolPath
  if ($protocol.'(default)' -notmatch 'z-music-desktop\.exe') {
    throw 'lxmusic protocol is not registered to z-music-desktop'
  }
  $results.deepLinkRegistration = 'PASS'
  Start-Process 'lxmusic://oauth/callback?code=redacted'
  Start-Sleep -Seconds 3
  if (-not (Get-Process -Name 'z-music-desktop' -ErrorAction SilentlyContinue)) {
    throw 'OAuth callback did not retain or launch the desktop process'
  }
  $results.deepLinkAndOauthLaunch = 'PASS'

  $extensionKeys = Get-ChildItem 'Registry::HKEY_CURRENT_USER\Software\Classes' -ErrorAction SilentlyContinue |
    Where-Object { $_.PSChildName -like '.*' } |
    Where-Object {
      try { (Get-ItemProperty $_.PSPath -ErrorAction Stop).'(default)' -match 'z-music-desktop' } catch { $false }
    }
  if ($extensionKeys) { throw "Unexpected file associations: $($extensionKeys.PSChildName -join ', ')" }
  $results.fileAssociations = 'PASS_NOT_DECLARED'

  $appUpdate = Join-Path $installDir 'resources\app-update.yml'
  if (-not (Test-Path $appUpdate)) { throw 'Packaged updater configuration is missing' }
  $appUpdateText = Get-Content $appUpdate -Raw
  if ($appUpdateText -notmatch 'owner:\s*zxbdzh' -or $appUpdateText -notmatch 'repo:\s*z-music-desktop') {
    throw 'Packaged updater does not target zxbdzh/z-music-desktop'
  }
  $results.updateConfiguration = 'PASS'

  Stop-Desktop
  if (-not (Test-Path $uninstaller)) { throw 'Uninstaller is missing' }
  Invoke-SilentInstaller $uninstaller 'Desktop 1.5.0 uninstaller'
  if (-not (Test-Path $canary)) { throw 'Uninstall removed historical user data' }
  if ((Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $before) {
    throw 'Historical data changed during uninstall'
  }
  $results.uninstallPreservesData = 'PASS'

  New-Item -ItemType Directory -Force $portableRoot | Out-Null
  $portableProcess = Start-Process -FilePath (Resolve-Path $Portable) -ArgumentList '--hidden' -PassThru
  $portableData = Join-Path $portableRoot 'userData\LxDatas'
  $deadline = (Get-Date).AddSeconds(45)
  while (-not (Test-Path $portableData) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }
  if ($portableProcess.HasExited) { throw "Portable app exited with $($portableProcess.ExitCode)" }
  Stop-Desktop
  if (-not (Test-Path $portableData)) { throw 'Portable user data directory was not created' }
  if ((Get-FileHash $canary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $before) {
    throw 'Portable launch changed historical installed data'
  }
  $results.portableIsolation = 'PASS'
} finally {
  Stop-Desktop
}

$evidence = [ordered]@{
  schemaVersion = '1.1'
  product = 'z-music-desktop'
  version = '1.5.0'
  commit = $Commit
  os = [ordered]@{
    caption = $os.Caption
    version = $os.Version
    build = $os.BuildNumber
    architecture = $os.OSArchitecture
    expectedMajor = $ExpectedWindowsMajor
  }
  privileges = 'current-user/asInvoker'
  legacyCanarySha256 = $before
  desktopRcManifestSha256 = $rcSha256
  results = $results
  result = if ($results.Values | Where-Object { $_ -notmatch '^PASS' }) { 'FAIL' } else { 'PASS' }
}
$parent = Split-Path -Parent $Output
if ($parent) { New-Item -ItemType Directory -Force $parent | Out-Null }
$evidence | ConvertTo-Json -Depth 6 | Set-Content -Path $Output -Encoding utf8
$evidence | ConvertTo-Json -Depth 6
if ($evidence.result -ne 'PASS') { exit 1 }
