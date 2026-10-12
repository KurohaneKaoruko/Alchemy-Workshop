# 炼金工坊 本地构建脚本
# 用法（在项目根目录执行）：pwsh -File tools/build.ps1
#
# 说明：
#   - 引擎与导出模板放在项目内 tools/godot/ 与 .godot-user/（均不入库）
#   - 通过 APPDATA 指向 .godot-user 实现便携式运行，不污染系统目录
#   - 产物输出到 builds/（不入库）

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $root "tools/godot/godot_console.exe"
$templates = Join-Path $root ".godot-user/Godot/export_templates"

if (-not (Test-Path $engine)) {
    Write-Error "缺少引擎：$engine（把 Godot 4.7.2 的 godot.exe / godot_console.exe 放到 tools/godot/）"
}
if (-not (Test-Path (Join-Path $templates "4.7.2.stable/windows_release_x86_64.exe"))) {
    Write-Error "缺少 Windows 导出模板：$templates/4.7.2.stable/windows_release_x86_64.exe"
}

$env:APPDATA = Join-Path $root ".godot-user"
Set-Location $root
New-Item -ItemType Directory -Force -Path "builds" | Out-Null

$version = (Select-String -Path "project.godot" -Pattern 'config/version="([^"]+)"').Matches[0].Groups[1].Value
$out = "builds/AlchemyWorkshop_v$version.exe"

Write-Host "[1/3] 导入资源..."
& $engine --headless --import 2>&1 | Out-Null

Write-Host "[2/3] 导出 Windows 版 -> $out"
& $engine --headless --export-release "Windows Desktop" $out
if ($LASTEXITCODE -ne 0) { Write-Error "导出失败（exit $LASTEXITCODE）" }

Write-Host "[3/3] 校验和"
$hash = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()
"$hash  $(Split-Path -Leaf $out)" | Out-File -Encoding ascii "builds/AlchemyWorkshop_v$version.exe.sha256"

$sizeMb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host ""
Write-Host "完成：$out ($sizeMb MB)"
Write-Host "sha256: $hash"
