param(
    [string]$GalleryDir = "$PSScriptRoot\..\img\gallery",
    [string]$OutputFile = "$PSScriptRoot\..\img\gallery\gallery-manifest.js",
    [string]$ThumbDir = "$PSScriptRoot\..\img\gallery\thumbs",
    [int]$ThumbWidth = 640,
    [int]$ThumbQuality = 70,
    [switch]$SkipThumbs
)

$extensions = @('.avif', '.webp', '.jpg', '.jpeg', '.png', '.gif')

$files = Get-ChildItem -File $GalleryDir |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name |
    Select-Object -ExpandProperty Name

$manifestJson = $files | ConvertTo-Json -Compress
$content = "window.GALLERY_MANIFEST = $manifestJson;`r`n"

Set-Content -Path $OutputFile -Value $content -Encoding UTF8
Write-Host "Manifest generado en: $OutputFile"

if (-not $SkipThumbs) {
    New-Item -ItemType Directory -Path $ThumbDir -Force | Out-Null

    foreach ($fileName in $files) {
        $sourcePath = Join-Path $GalleryDir $fileName
        $thumbPath = Join-Path $ThumbDir $fileName

        $needsThumb = $true
        if (Test-Path $thumbPath) {
            $sourceInfo = Get-Item $sourcePath
            $thumbInfo = Get-Item $thumbPath
            $needsThumb = $sourceInfo.LastWriteTimeUtc -gt $thumbInfo.LastWriteTimeUtc
        }

        if ($needsThumb) {
            & npx sharp-cli -i $sourcePath -o $ThumbDir resize $ThumbWidth -f webp -q $ThumbQuality | Out-Null
            Write-Host "Thumb generado: $fileName"
        }
    }

    Get-ChildItem -Path $ThumbDir -File |
        Where-Object { $files -notcontains $_.Name } |
        ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force
            Write-Host "Thumb eliminado: $($_.Name)"
        }

    Write-Host "Thumbs listos en: $ThumbDir"
}
