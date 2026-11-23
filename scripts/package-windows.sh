#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

node_version=24.22.3
distribution="node-v${node_version}-win-x64"
download_url="https://nodejs.org/dist/v${node_version}"
release_dir="$PWD/work/windows-release"
cache_dir="$release_dir/node-v${node_version}"
node_archive="$cache_dir/$distribution.zip"

mkdir -p "$cache_dir" out
curl -fsSL --retry 2 "$download_url/SHASUMS256.txt" -o "$cache_dir/SHASUMS256.txt"
if [[ ! -f "$node_archive" ]]; then
  curl -fsSL --retry 2 "$download_url/$distribution.zip" -o "$node_archive.partial"
  mv "$node_archive.partial" "$node_archive"
fi
(
  cd "$cache_dir"
  awk -v archive="$distribution.zip" '$2 == archive { print }' SHASUMS256.txt | sha256sum -c -
)

for env_file in .env .env.local .env.production .env.production.local; do
  if [[ -e "$env_file" ]]; then
    printf 'Build the public preview from a clean checkout without %s.\n' "$env_file" >&2
    exit 1
  fi
done

SAKYRO_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 npm run build

staging_dir="$(mktemp -d "$release_dir/staging.XXXXXX")"
trap 'rm -rf -- "$staging_dir"' EXIT
bundle="$staging_dir/SAKYRO-Windows"
mkdir -p "$bundle/app" "$bundle/runtime"
cp -a .next/standalone/{server.js,package.json,node_modules,.next} "$bundle/app/"
rm -rf -- "$bundle/app/node_modules/@img"/sharp-{linux,libvips-linux}-*
cp -a .next/static "$bundle/app/.next/"
cp -a public db "$bundle/app/"
unzip -p "$node_archive" "$distribution/node.exe" > "$bundle/runtime/node.exe"
unzip -p "$node_archive" "$distribution/LICENSE" > "$bundle/runtime/LICENSE.txt"
awk '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' scripts/windows/start.bat > "$bundle/start.bat"
awk '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' scripts/windows/settings.example.bat > "$bundle/settings.example.bat"
cp scripts/windows/README.txt "$bundle/README.txt"

for package in next react react-dom lucide-react @fontsource-variable/manrope @fontsource-variable/golos-text \
  @img/colour @swc/helpers detect-libc sharp semver styled-jsx; do
  license_dir="$bundle/licenses/$package"
  mkdir -p "$license_dir"
  find "node_modules/$package" -maxdepth 1 -type f \( -iname 'license*' -o -iname 'ofl*' \) -exec cp -t "$license_dir" {} +
done

(
  cd "$staging_dir"
  zip -q -r SAKYRO-Windows.zip SAKYRO-Windows
)
mv "$staging_dir/SAKYRO-Windows.zip" out/SAKYRO-Windows.zip
printf 'Created out/SAKYRO-Windows.zip\n'
