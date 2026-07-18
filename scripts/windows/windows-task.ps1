param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Install", "Remove", "Start", "Describe")]
  [string]$Action,
  [string]$TaskName = "DesignCodexTheme",
  [string]$NodePath = "node.exe",
  [string]$ControllerPath = "controller.mjs",
  [string]$Root = "",
  [int]$Port = 9222
)

$ErrorActionPreference = "Stop"
$arguments = '"{0}" --root "{1}" --port {2}' -f $ControllerPath.Replace('"', '\"'), $Root.Replace('"', '\"'), $Port

if ($Action -eq "Describe") {
  @{ taskName = $TaskName; execute = $NodePath; arguments = $arguments; currentUser = $env:USERNAME } | ConvertTo-Json -Compress
  exit 0
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($Action -eq "Install") {
  if ($existing) {
    $owned = @($existing.Actions | Where-Object { $_.Execute -eq $NodePath -and $_.Arguments -like "*$ControllerPath*" }).Count -gt 0
    if (-not $owned) { throw "Scheduled Task conflict: $TaskName exists but is not owned by design-codex-theme" }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  $taskAction = New-ScheduledTaskAction -Execute $NodePath -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
  Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Trigger $trigger -Settings $settings -Description "Reapplies locally designed Codex themes" | Out-Null
  Start-ScheduledTask -TaskName $TaskName
  @{ installed = $true; taskName = $TaskName } | ConvertTo-Json -Compress
  exit 0
}

if ($Action -eq "Remove") {
  if ($existing) {
    $owned = @($existing.Actions | Where-Object { $_.Execute -eq $NodePath -and $_.Arguments -like "*$ControllerPath*" }).Count -gt 0
    if (-not $owned) { throw "Refusing to remove unowned Scheduled Task: $TaskName" }
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  @{ removed = $true; taskName = $TaskName } | ConvertTo-Json -Compress
  exit 0
}

if (-not $existing) { throw "Scheduled Task not installed: $TaskName" }
Start-ScheduledTask -TaskName $TaskName
@{ started = $true; taskName = $TaskName } | ConvertTo-Json -Compress
