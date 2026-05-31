#!/bin/bash
set +e
cd "$(dirname "$0")/three128" || exit 1
BASE="https://unpkg.com/three@0.128.0/examples/js"
FILES=(
  "shaders/LuminosityHighPassShader.js"
  "shaders/SSAOShader.js"
  "shaders/BokehShader.js"
  "shaders/FXAAShader.js"
  "shaders/VignetteShader.js"
  "postprocessing/EffectComposer.js"
  "postprocessing/RenderPass.js"
  "postprocessing/ShaderPass.js"
  "postprocessing/MaskPass.js"
  "postprocessing/SSAOPass.js"
  "postprocessing/UnrealBloomPass.js"
  "postprocessing/BokehPass.js"
  "math/SimplexNoise.js"
)
for f in "${FILES[@]}"; do
  out="$(basename "$f")"
  code="$(curl -s -L -o "$out" -w '%{http_code}' "$BASE/$f")"
  sz="$(wc -c < "$out" 2>/dev/null | tr -d ' ')"
  echo "$code  $out  ${sz}b"
done
echo "=== listing ==="
ls -la
