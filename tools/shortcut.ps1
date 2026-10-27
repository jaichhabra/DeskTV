# Adds DeskTV to the Start menu (and the desktop), run by Electron's signed runtime from this folder.
# For PCs where Windows' Smart App Control blocks unsigned programs, like the unsigned installer.
# Run it after `npm install` and `npm run build`.
param([switch]$NoDesktop)
$root = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $electron)) { throw 'Run npm install first.' }
if (-not (Test-Path (Join-Path $root 'out\main\index.js'))) { throw 'Run npm run build first.' }
$shell = New-Object -ComObject WScript.Shell
$places = @([Environment]::GetFolderPath('Programs'))
if (-not $NoDesktop) { $places += [Environment]::GetFolderPath('Desktop') }
foreach ($dir in $places) {
  $link = $shell.CreateShortcut((Join-Path $dir 'DeskTV.lnk'))
  $link.TargetPath = $electron
  $link.Arguments = "`"$root`""
  $link.WorkingDirectory = $root
  $link.IconLocation = (Join-Path $root 'build\icon.ico')
  $link.Description = 'DeskTV'
  $link.Save()
  Write-Output "Added $(Join-Path $dir 'DeskTV.lnk')"
}
