module.exports = {
  run: [
    // Pull launcher itself
    {
      method: "shell.run",
      params: { message: "git pull" }
    },
    // Pull ACE-Step-Studio app
    {
      when: "{{exists('app')}}",
      method: "shell.run",
      params: {
        path: "app",
        message: "git pull"
      }
    },
    // Pull ACE-Step-1.5 pipeline
    {
      when: "{{exists('app/ACE-Step-1.5')}}",
      method: "shell.run",
      params: {
        path: "app/ACE-Step-1.5",
        message: "git pull"
      }
    },
    // Rebuild frontend
    {
      when: "{{exists('app/app/node_modules')}}",
      method: "shell.run",
      params: {
        path: "app/app",
        message: ["npm install", "npx vite build"]
      }
    },
    // Server deps refresh
    {
      when: "{{exists('app/app/server/node_modules')}}",
      method: "shell.run",
      params: {
        path: "app/app/server",
        message: ["npm install"]
      }
    },
    // Python deps refresh — pulls in any new deps added since first install.
    // As of 2026-05-04: pytorch-wavelets + pywavelets for DCW (CVPR 2026 quality boost).
    // uv is idempotent; already-installed deps are no-ops.
    {
      when: "{{exists('app/env')}}",
      method: "shell.run",
      params: {
        path: "app",
        venv: "env",
        message: [
          "uv pip install \"pytorch-wavelets>=1.3.0\" \"pywavelets>=1.9.0\""
        ]
      }
    },
    // ffmpeg.exe for Windows — added 2026-05-05. Existing installs that
    // pre-date the install.js update never got ffmpeg downloaded, so the
    // Video Studio fails with "Video rendering failed". Run the same
    // download step here as a one-time catch-up; subsequent updates skip
    // because the installed-check inside the PowerShell script bails out
    // when ffmpeg.exe is already in place.
    {
      when: "{{platform === 'win32' && exists('app')}}",
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "powershell -NoProfile -ExecutionPolicy Bypass -Command \"" +
            "$dst = Join-Path (Get-Location) 'ffmpeg'; " +
            "New-Item -ItemType Directory -Path $dst -Force | Out-Null; " +
            "if (Test-Path (Join-Path $dst 'ffmpeg.exe')) { Write-Host '[ffmpeg] already present, skipping'; exit 0 }; " +
            "$tmp = Join-Path $env:TEMP 'ace-ffmpeg'; " +
            "New-Item -ItemType Directory -Path $tmp -Force | Out-Null; " +
            "$zip = Join-Path $tmp 'ffmpeg.zip'; " +
            "Write-Host '[ffmpeg] downloading release-essentials build...'; " +
            "Invoke-WebRequest -UseBasicParsing 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip; " +
            "Expand-Archive -Path $zip -DestinationPath $tmp -Force; " +
            "$exe = Get-ChildItem -Path $tmp -Filter 'ffmpeg.exe' -Recurse | Select-Object -First 1; " +
            "$probe = Get-ChildItem -Path $tmp -Filter 'ffprobe.exe' -Recurse | Select-Object -First 1; " +
            "if (-not $exe) { throw 'ffmpeg.exe not found in archive' }; " +
            "Copy-Item -Path $exe.FullName -Destination (Join-Path $dst 'ffmpeg.exe') -Force; " +
            "if ($probe) { Copy-Item -Path $probe.FullName -Destination (Join-Path $dst 'ffprobe.exe') -Force }; " +
            "Remove-Item -Path $tmp -Recurse -Force; " +
            "Write-Host '[ffmpeg] installed to' $dst" +
            "\""
        ]
      }
    }
  ]
}
