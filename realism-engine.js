/* ════════════════════════════════════════════════════════════════════════════
   REALISM ENGINE  (loaded before the main configurator script — defines globals)
   ----------------------------------------------------------------------------
   Adds: real soft contact shadows, a reflective studio floor, an independent
   paper-grain normal tiling (works around three r128's single shared UV
   transform), post-processing (SSAO / bloom / DoF / vignette+grade / FXAA), a
   dynamic light-layer manager, and a custom PBR-map uploader.
   Everything reads the global `REALISM` config object (defined in the page).
   All entry points are guarded so a failure here can never break rendering.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _rlmInit     = { scene: false, bag: false };
  var _rlmComposer = null;
  var _rlmPasses   = {};
  var _rlmSize     = { w: 0, h: 0, pr: 0 };
  var _rlmPrevBg   = undefined;       // saved scene.background while post is on

  function _aniso() { try { return (typeof _maxAniso === 'function') ? _maxAniso() : 8; } catch (e) { return 8; } }
  function _groundY() { try { return BLOB.groundY + GROUND_OFFSET; } catch (e) { return -0.699; } }

  /* ───────────────────────── GROUND: floor + shadow catcher ───────────────── */
  function _buildGround() {
    if (!T.scene) return;
    var gy = _groundY();
    if (!T.floor) {
      var fgeo = new THREE.PlaneGeometry(60, 60); fgeo.rotateX(-Math.PI / 2);
      var fmat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(REALISM.floorColor),
        roughness: REALISM.floorRough, metalness: REALISM.floorMetal,
        transparent: true, alphaMap: _rlmRadialAlpha(),
        opacity: (REALISM.floorOpacity != null ? REALISM.floorOpacity : 1.0),
      });
      fmat.userData.envFactor = REALISM.floorEnv;
      T.floor = new THREE.Mesh(fgeo, fmat);
      T.floor.position.y = gy; T.floor.receiveShadow = true; T.floor.renderOrder = -3;
      T.scene.add(T.floor);
    }
    if (!T.shadowCatcher) {
      var sgeo = new THREE.PlaneGeometry(60, 60); sgeo.rotateX(-Math.PI / 2);
      var smat = new THREE.ShadowMaterial({ opacity: REALISM.shadowDarkness });
      T.shadowCatcher = new THREE.Mesh(sgeo, smat);
      T.shadowCatcher.position.y = gy + 0.001; T.shadowCatcher.receiveShadow = true; T.shadowCatcher.renderOrder = -3;
      T.scene.add(T.shadowCatcher);
    }
    _applyGroundState();
    if (typeof applyHdriIntensity === 'function') applyHdriIntensity(hdriBaseIntensity);
  }

  function _applyGroundState() {
    var so = REALISM.shadowOn, fo = REALISM.floorOn;
    if (T.keyLight) T.keyLight.castShadow = so;
    if (T.floor) { T.floor.visible = fo; if (T.floor.receiveShadow !== so) { T.floor.receiveShadow = so; T.floor.material.needsUpdate = true; } }
    if (T.shadowCatcher) { T.shadowCatcher.visible = so && !fo; T.shadowCatcher.material.opacity = REALISM.shadowDarkness; }
  }
  window._rlmSyncGroundY = function (gy) {            // called from updateBoxFromScale
    if (T.floor) T.floor.position.y = gy;
    if (T.shadowCatcher) T.shadowCatcher.position.y = gy + 0.001;
  };

  /* ───────────────── PAPER-GRAIN NORMAL: independent UV tiling ─────────────
     three r128 uses ONE uv transform (from `map`) for every texture, so the
     normalMap's own .repeat is ignored. Inject a dedicated uv scale uniform via
     onBeforeCompile so the fibre grain can tile at any density. */
  function _patchPaperNormalUV(mat) {
    if (!mat || (mat.userData && mat.userData._paperPatched)) return;
    mat.userData = mat.userData || {};
    /* tiling is now baked into the normal canvas itself (configurator side), so this
       injected uv-scale must stay at 1× — kept only as a harmless no-op. */
    mat.userData._paperUV = { value: new THREE.Vector2(1, 1) };
    var prev = mat.onBeforeCompile;
    mat.onBeforeCompile = function (shader) {
      if (prev) { try { prev(shader); } catch (e) {} }
      shader.uniforms.paperNormalTileUV = mat.userData._paperUV;
      shader.fragmentShader = 'uniform vec2 paperNormalTileUV;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        /texture2D\(\s*normalMap\s*,\s*vUv\s*\)/g,
        'texture2D( normalMap, vUv * paperNormalTileUV )'
      );
    };
    mat.userData._paperPatched = true;
    mat.needsUpdate = true;
  }
  window._rlmSetPaperTile = function (t) {
    try { if (bagMeshRef && bagMeshRef.material.userData._paperUV) bagMeshRef.material.userData._paperUV.value.set(t, t); } catch (e) {}
  };

  /* ───────────────────────────── INIT (scene / bag) ───────────────────────── */
  window.initRealismScene = function () {
    if (_rlmInit.scene) return;
    try {
      try { window.rlmApplyDefaults(); } catch (e) {}   /* apply saved defaults before building the scene */
      if (T.renderer) T.renderer.toneMappingExposure = REALISM.exposure;
      _buildGround();
      _buildComposer();
      try { _rlmRenderLights(); } catch (e) {}
      try { _rlmRenderMapRows(); } catch (e) {}
      if (REALISM.postOn) { var pcb = document.getElementById('rlm-post-on'); if (pcb) pcb.checked = true; _rlmApplyPostBg(); }
      _rlmInit.scene = true;
    } catch (e) { console.warn('[realism] initRealismScene', e); }
  };

  window.rlmResetBag = function () { _rlmInit.bag = false; };

  window.initRealismBag = function () {
    if (_rlmInit.bag) return;
    try {
      if (typeof bagGroup !== 'undefined' && bagGroup) {
        bagGroup.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      }
      if (typeof bagMeshRef !== 'undefined' && bagMeshRef) {
        var m = bagMeshRef.material, an = _aniso();
        _patchPaperNormalUV(m);
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'alphaMap'].forEach(function (k) {
          if (!m[k]) return;
          m[k].anisotropy = an;
          if (m[k].image) m[k].needsUpdate = true;   /* only flag upload when the image is ready */
        });
        m.needsUpdate = true;
      }
      _rlmApplyDefaultPaperFinish();
      _rlmInit.bag = true;
    } catch (e) { console.warn('[realism] initRealismBag', e); }
  };

  /* ─────────────────────────── POST-PROCESSING ────────────────────────────── */
  var _RLM_GRADE_SHADER = {
    uniforms: {
      tDiffuse:   { value: null },
      vignette:   { value: 0.5 },
      saturation: { value: 1.06 },
      contrast:   { value: 1.03 },
      brightness: { value: 1.0 },
      tint:       { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float vignette; uniform float saturation; uniform float contrast; uniform float brightness; uniform vec3 tint;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec4 tex = texture2D( tDiffuse, vUv );',
      '  vec3 c = tex.rgb * brightness;',
      '  c = ( c - 0.5 ) * contrast + 0.5;',
      '  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
      '  c = mix( vec3( l ), c, saturation );',
      '  c *= tint;',
      '  vec2 p = vUv - 0.5;',
      '  float vig = 1.0 - vignette * dot( p, p ) * 2.2;',
      '  c *= clamp( vig, 0.0, 1.0 );',
      '  gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), tex.a );',
      '}'
    ].join('\n')
  };

  /* linear → sRGB output encoding (the composer renders to linear targets, so the
     renderer's own sRGB output encoding is bypassed — re-apply it here, last). */
  var _RLM_OUTPUT_SHADER = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; varying vec2 vUv;',
      'void main(){',
      '  vec4 c = texture2D( tDiffuse, vUv );',
      '  vec3 lo = c.rgb * 12.92;',
      '  vec3 hi = 1.055 * pow( max( c.rgb, vec3(0.0) ), vec3( 1.0 / 2.4 ) ) - 0.055;',
      '  vec3 s = mix( lo, hi, step( vec3( 0.0031308 ), c.rgb ) );',
      '  gl_FragColor = vec4( s, c.a );',
      '}'
    ].join('\n')
  };

  function _buildComposer() {
    if (_rlmComposer || !T.renderer || !T.scene || !T.camera) return;
    if (typeof THREE.EffectComposer === 'undefined' || typeof THREE.RenderPass === 'undefined') {
      console.warn('[realism] post-processing add-ons not loaded — post disabled'); return;
    }
    try {
      var sz = new THREE.Vector2(); T.renderer.getSize(sz);
      var pr = T.renderer.getPixelRatio();
      _rlmComposer = new THREE.EffectComposer(T.renderer);
      _rlmComposer.setPixelRatio(pr);
      _rlmComposer.setSize(sz.x, sz.y);

      _rlmPasses.render = new THREE.RenderPass(T.scene, T.camera);
      _rlmComposer.addPass(_rlmPasses.render);

      if (THREE.SSAOPass) {
        var ssao = new THREE.SSAOPass(T.scene, T.camera, sz.x, sz.y);
        ssao.kernelRadius = REALISM.ssao.radius; ssao.minDistance = REALISM.ssao.minDist; ssao.maxDistance = REALISM.ssao.maxDist;
        ssao.enabled = REALISM.ssao.on; _rlmComposer.addPass(ssao); _rlmPasses.ssao = ssao;
      }
      if (THREE.UnrealBloomPass) {
        var bloom = new THREE.UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), REALISM.bloom.strength, REALISM.bloom.radius, REALISM.bloom.threshold);
        bloom.enabled = REALISM.bloom.on; _rlmComposer.addPass(bloom); _rlmPasses.bloom = bloom;
      }
      if (THREE.BokehPass) {
        var dof = new THREE.BokehPass(T.scene, T.camera, { focus: REALISM.dof.focus, aperture: REALISM.dof.aperture * 0.001, maxblur: REALISM.dof.maxblur, width: sz.x, height: sz.y });
        dof.enabled = REALISM.dof.on; _rlmComposer.addPass(dof); _rlmPasses.dof = dof;
      }
      var grade = new THREE.ShaderPass(_RLM_GRADE_SHADER);
      grade.enabled = (REALISM.vignette.on || REALISM.grade.on); _rlmComposer.addPass(grade); _rlmPasses.grade = grade;
      _rlmUpdateGrade();

      /* sRGB output encoding (always on while post is active) */
      var outPass = new THREE.ShaderPass(_RLM_OUTPUT_SHADER);
      _rlmComposer.addPass(outPass); _rlmPasses.output = outPass;

      if (THREE.FXAAShader) {
        var fxaa = new THREE.ShaderPass(THREE.FXAAShader);
        fxaa.enabled = REALISM.fxaa.on; _rlmComposer.addPass(fxaa); _rlmPasses.fxaa = fxaa;
      }
      _rlmSize = { w: sz.x, h: sz.y, pr: pr };
      _rlmSyncFxaa();
    } catch (e) { console.warn('[realism] _buildComposer', e); _rlmComposer = null; }
  }

  function _rlmUpdateGrade() {
    var g = _rlmPasses.grade; if (!g) return;
    g.uniforms.vignette.value   = REALISM.vignette.on ? REALISM.vignette.amount : 0.0;
    g.uniforms.saturation.value = REALISM.grade.on ? REALISM.grade.saturation : 1.0;
    g.uniforms.contrast.value   = REALISM.grade.on ? REALISM.grade.contrast   : 1.0;
    g.uniforms.brightness.value = REALISM.grade.on ? REALISM.grade.brightness : 1.0;
    if (g.uniforms.tint) g.uniforms.tint.value.set(REALISM.grade.on ? 1.03 : 1.0, 1.0, REALISM.grade.on ? 0.965 : 1.0);
    g.enabled = REALISM.vignette.on || REALISM.grade.on;
  }
  function _rlmSyncFxaa() {
    var f = _rlmPasses.fxaa; if (!f || !f.material || !f.material.uniforms.resolution) return;
    f.material.uniforms.resolution.value.set(1 / (_rlmSize.w * _rlmSize.pr), 1 / (_rlmSize.h * _rlmSize.pr));
  }
  function _rlmSyncSize() {
    if (!T.renderer || !_rlmComposer) return;
    var s = new THREE.Vector2(); T.renderer.getSize(s);
    var pr = T.renderer.getPixelRatio();
    if (s.x === _rlmSize.w && s.y === _rlmSize.h && pr === _rlmSize.pr) return;
    _rlmSize = { w: s.x, h: s.y, pr: pr };
    _rlmComposer.setPixelRatio(pr); _rlmComposer.setSize(s.x, s.y);
    _rlmSyncFxaa();
  }

  /* studio backdrop so post (which is opaque) doesn't kill the see-through bg */
  function _rlmStudioBg() {
    var S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var g = cv.getContext('2d');
    var dark = (typeof isDarkMode === 'function') && isDarkMode();
    var lin = g.createLinearGradient(0, 0, 0, S);
    if (dark) { lin.addColorStop(0, '#23232a'); lin.addColorStop(0.62, '#17171d'); lin.addColorStop(1, '#101015'); }
    else      { lin.addColorStop(0, '#ece9e4'); lin.addColorStop(0.62, '#e1dcd3'); lin.addColorStop(1, '#d4cec4'); }
    g.fillStyle = lin; g.fillRect(0, 0, S, S);
    /* very gentle center lift (subtle, not an oval) */
    var rad = g.createRadialGradient(S * 0.5, S * 0.52, S * 0.05, S * 0.5, S * 0.55, S * 0.78);
    rad.addColorStop(0, dark ? 'rgba(120,120,145,0.12)' : 'rgba(255,255,255,0.16)');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad; g.fillRect(0, 0, S, S);
    var tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true; return tex;
  }
  /* radial opacity: opaque under the product, fading to transparent at the edges so
     the floor dissolves into the backdrop with no hard horizon line. */
  function _rlmRadialAlpha() {
    var S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var g = cv.getContext('2d');
    var rad = g.createRadialGradient(S / 2, S / 2, S * 0.06, S / 2, S / 2, S * 0.50);
    rad.addColorStop(0, '#ffffff'); rad.addColorStop(0.45, '#ffffff'); rad.addColorStop(1, '#000000');
    g.fillStyle = rad; g.fillRect(0, 0, S, S);
    var tex = new THREE.CanvasTexture(cv); tex.needsUpdate = true; return tex;
  }
  var _rlmStudioBgTex = null;
  /* Self-healing backdrop: post needs an opaque frame. When post is on and there's
     no background (HDRI bg hidden → transparent), drop in the studio sweep. Re-checked
     each frame because the async HDRI load resets scene.background after init.
     If the user shows the real HDRI bg, that's truthy → we leave it alone. */
  function _rlmApplyPostBg() {
    if (!T.scene) return;
    if (REALISM.postOn) {
      if (!T.scene.background) {
        if (!_rlmStudioBgTex) _rlmStudioBgTex = _rlmStudioBg();
        T.scene.background = _rlmStudioBgTex;
      }
    } else if (T.scene.background && T.scene.background === _rlmStudioBgTex) {
      T.scene.background = null;
    }
  }

  /* the render entry point — called from the animate() loop */
  window.realismRender = function () {
    try {
      _rlmApplyPostBg();
      if (_rlmGizmoGroup) _rlmUpdateGizmos();
      if (T.renderer && T.renderer.info) {            /* count draws across ALL post passes, not just the last */
        if (_rlmPerf.on) { T.renderer.info.autoReset = false; T.renderer.info.reset(); }
        else { T.renderer.info.autoReset = true; }
      }
      if (REALISM.postOn && _rlmComposer) { _rlmSyncSize(); _rlmComposer.render(); }
      else { T.renderer.render(T.scene, T.camera); }
      _rlmPerfTick();
    } catch (e) { try { T.renderer.render(T.scene, T.camera); } catch (e2) {} }
  };

  /* ─────────────────────────── CONTROL HANDLERS ───────────────────────────── */
  function _val(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

  window.onExposureSlider = function (v) { REALISM.exposure = parseFloat(v); _val('rlm-exposure-val', REALISM.exposure.toFixed(2)); if (T.renderer) T.renderer.toneMappingExposure = REALISM.exposure; };

  window.onRealShadowToggle = function (c) { REALISM.shadowOn = !!c; _applyGroundState(); };
  window.onShadowDarkness   = function (v) { REALISM.shadowDarkness = parseFloat(v); _val('rlm-shadow-dark-val', REALISM.shadowDarkness.toFixed(2)); _applyGroundState(); };

  window.onFloorToggle = function (c) { REALISM.floorOn = !!c; _applyGroundState(); };
  window.onFloorColor  = function (v) { REALISM.floorColor = v; if (T.floor) T.floor.material.color.set(v); };
  window.onFloorRough  = function (v) { REALISM.floorRough = parseFloat(v); _val('rlm-floor-rough-val', REALISM.floorRough.toFixed(2)); if (T.floor) T.floor.material.roughness = REALISM.floorRough; };
  window.onFloorMetal  = function (v) { REALISM.floorMetal = parseFloat(v); _val('rlm-floor-metal-val', REALISM.floorMetal.toFixed(2)); if (T.floor) T.floor.material.metalness = REALISM.floorMetal; };
  window.onFloorEnv    = function (v) { REALISM.floorEnv = parseFloat(v); _val('rlm-floor-env-val', REALISM.floorEnv.toFixed(2)); if (T.floor) { T.floor.material.userData.envFactor = REALISM.floorEnv; if (typeof applyHdriIntensity === 'function') applyHdriIntensity(hdriBaseIntensity); } };
  window.onFloorOpacity = function (v) { REALISM.floorOpacity = parseFloat(v); _val('rlm-floor-opacity-val', REALISM.floorOpacity.toFixed(2)); if (T.floor) { T.floor.material.opacity = REALISM.floorOpacity; T.floor.material.transparent = true; T.floor.material.needsUpdate = true; } };

  window.onPostToggle = function (c) { REALISM.postOn = !!c; _rlmApplyPostBg(); };
  window.onSsaoToggle = function (c) { REALISM.ssao.on = !!c; if (_rlmPasses.ssao) _rlmPasses.ssao.enabled = REALISM.ssao.on; };
  window.onSsaoRadius = function (v) { REALISM.ssao.radius = parseFloat(v); _val('rlm-ssao-radius-val', REALISM.ssao.radius.toFixed(2)); if (_rlmPasses.ssao) _rlmPasses.ssao.kernelRadius = REALISM.ssao.radius; };
  window.onSsaoMin    = function (v) { REALISM.ssao.minDist = parseFloat(v); _val('rlm-ssao-min-val', REALISM.ssao.minDist.toFixed(3)); if (_rlmPasses.ssao) _rlmPasses.ssao.minDistance = REALISM.ssao.minDist; };
  window.onSsaoMax    = function (v) { REALISM.ssao.maxDist = parseFloat(v); _val('rlm-ssao-max-val', REALISM.ssao.maxDist.toFixed(3)); if (_rlmPasses.ssao) _rlmPasses.ssao.maxDistance = REALISM.ssao.maxDist; };

  window.onBloomToggle    = function (c) { REALISM.bloom.on = !!c; if (_rlmPasses.bloom) _rlmPasses.bloom.enabled = REALISM.bloom.on; };
  window.onBloomStrength  = function (v) { REALISM.bloom.strength = parseFloat(v); _val('rlm-bloom-strength-val', REALISM.bloom.strength.toFixed(2)); if (_rlmPasses.bloom) _rlmPasses.bloom.strength = REALISM.bloom.strength; };
  window.onBloomRadius    = function (v) { REALISM.bloom.radius = parseFloat(v); _val('rlm-bloom-radius-val', REALISM.bloom.radius.toFixed(2)); if (_rlmPasses.bloom) _rlmPasses.bloom.radius = REALISM.bloom.radius; };
  window.onBloomThreshold = function (v) { REALISM.bloom.threshold = parseFloat(v); _val('rlm-bloom-thresh-val', REALISM.bloom.threshold.toFixed(2)); if (_rlmPasses.bloom) _rlmPasses.bloom.threshold = REALISM.bloom.threshold; };

  window.onDofToggle   = function (c) { REALISM.dof.on = !!c; if (_rlmPasses.dof) _rlmPasses.dof.enabled = REALISM.dof.on; };
  function _dofU(name, v) { var d = _rlmPasses.dof; if (d && d.uniforms && d.uniforms[name]) d.uniforms[name].value = v; }
  window.onDofFocus    = function (v) { REALISM.dof.focus = parseFloat(v); _val('rlm-dof-focus-val', REALISM.dof.focus.toFixed(2)); _dofU('focus', REALISM.dof.focus); };
  window.onDofAperture = function (v) { REALISM.dof.aperture = parseFloat(v); _val('rlm-dof-aperture-val', REALISM.dof.aperture.toFixed(2)); _dofU('aperture', REALISM.dof.aperture * 0.001); };
  window.onDofMaxblur  = function (v) { REALISM.dof.maxblur = parseFloat(v); _val('rlm-dof-maxblur-val', REALISM.dof.maxblur.toFixed(3)); _dofU('maxblur', REALISM.dof.maxblur); };

  window.onVignetteToggle = function (c) { REALISM.vignette.on = !!c; _rlmUpdateGrade(); };
  window.onVignetteAmount = function (v) { REALISM.vignette.amount = parseFloat(v); _val('rlm-vignette-val', REALISM.vignette.amount.toFixed(2)); _rlmUpdateGrade(); };
  window.onGradeToggle    = function (c) { REALISM.grade.on = !!c; _rlmUpdateGrade(); };
  window.onGradeSat       = function (v) { REALISM.grade.saturation = parseFloat(v); _val('rlm-grade-sat-val', REALISM.grade.saturation.toFixed(2)); _rlmUpdateGrade(); };
  window.onGradeContrast  = function (v) { REALISM.grade.contrast = parseFloat(v); _val('rlm-grade-con-val', REALISM.grade.contrast.toFixed(2)); _rlmUpdateGrade(); };
  window.onGradeBright    = function (v) { REALISM.grade.brightness = parseFloat(v); _val('rlm-grade-bri-val', REALISM.grade.brightness.toFixed(2)); _rlmUpdateGrade(); };
  window.onFxaaToggle     = function (c) { REALISM.fxaa.on = !!c; if (_rlmPasses.fxaa) _rlmPasses.fxaa.enabled = REALISM.fxaa.on; };

  /* ───────────────────────── LIGHT-LAYER MANAGER ──────────────────────────── */
  var _rlmLights = [];
  var _rlmLightSeq = 1;
  var _rlmRectInit = false;   /* RectAreaLight needs its BRDF uniforms lib init'd once or it emits no light */
  var _DEG = Math.PI / 180;
  function _rlmMakeLight(type) {
    if (type === 'ambient')      return new THREE.AmbientLight(0xffffff, 0.5);
    if (type === 'hemisphere')   return new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    if (type === 'directional')  return new THREE.DirectionalLight(0xffffff, 1.0);
    if (type === 'spot')         return new THREE.SpotLight(0xffffff, 1.2, 25, Math.PI / 6, 0.3, 1.5);
    if (type === 'area') {
      if (THREE.RectAreaLightUniformsLib && !_rlmRectInit) { try { THREE.RectAreaLightUniformsLib.init(); _rlmRectInit = true; } catch (e) {} }
      return new THREE.RectAreaLight(0xffffff, 5.0, 3.0, 2.0);
    }
    return new THREE.PointLight(0xffffff, 1.2, 25, 1.5);
  }
  window.rlmToggleAddMenu = function () {
    var m = document.getElementById('rlm-add-light-menu'); if (!m) return;
    m.style.display = (m.style.display === 'grid') ? 'none' : 'grid';
  };
  window.rlmAddLight = function (type) {
    if (!T.scene) return;
    type = type || 'point';
    var L = _rlmMakeLight(type);
    var positioned = (type !== 'ambient' && type !== 'hemisphere');
    if (positioned) L.position.set(2.5, 3.5, 2.5);
    var def = {
      id: _rlmLightSeq++, type: type, obj: L, enabled: true, expanded: true,
      color: '#ffffff', intensity: L.intensity, skyColor: '#ffffff', groundColor: '#444444',
      x: 2.5, y: 3.5, z: 2.5, dist: 25, decay: 1.5, angle: 30, penumbra: 0.3,
      width: 3.0, height: 2.0, rotX: 0, rotY: 0, rotZ: 0, uniform: false, showPlane: false, showNull: true, plane: null
    };
    if (type === 'area') {                       /* aim at the product, then expose its rotation */
      L.lookAt(0, 0, 0);
      def.rotX = +(L.rotation.x / _DEG).toFixed(1); def.rotY = +(L.rotation.y / _DEG).toFixed(1); def.rotZ = +(L.rotation.z / _DEG).toFixed(1);
    }
    T.scene.add(L);
    if (L.target) T.scene.add(L.target);
    _rlmLights.push(def);
    var menu = document.getElementById('rlm-add-light-menu'); if (menu) menu.style.display = 'none';
    _rlmRenderLights();
    _rlmRebuildGizmos();
  };
  function _rlmFindLight(id) { return _rlmLights.find(function (x) { return x.id === id; }); }
  window.rlmRemoveLight = function (id) {
    var i = _rlmLights.findIndex(function (d) { return d.id === id; });
    if (i < 0) return;
    var d = _rlmLights[i];
    if (d.plane) { T.scene.remove(d.plane); if (d.plane.geometry) d.plane.geometry.dispose(); if (d.plane.material) d.plane.material.dispose(); }
    if (d.obj) { if (d.obj.target && d.obj.target.parent) T.scene.remove(d.obj.target); T.scene.remove(d.obj); if (d.obj.dispose) d.obj.dispose(); }
    _rlmLights.splice(i, 1);
    _rlmRenderLights();
    _rlmRebuildGizmos();
  };
  window.rlmToggleLight = function (id) {
    var d = _rlmFindLight(id); if (!d) return;
    d.enabled = !d.enabled; d.obj.visible = d.enabled;
    if (d.plane) d.plane.visible = d.enabled && d.showPlane;
    _rlmRenderLights(); _rlmRebuildGizmos();
  };
  window.rlmExpandLight = function (id) { var d = _rlmFindLight(id); if (d) { d.expanded = !d.expanded; _rlmRenderLights(); } };
  window.rlmLightProp = function (id, prop, v) {
    var d = _rlmFindLight(id); if (!d) return;
    if (prop === 'color')            { d.color = v; if (d.obj.color) d.obj.color.set(v); }
    else if (prop === 'skyColor')    { d.skyColor = v; if (d.obj.color) d.obj.color.set(v); }
    else if (prop === 'groundColor') { d.groundColor = v; if (d.obj.groundColor) d.obj.groundColor.set(v); }
    else d[prop] = parseFloat(v);
    if (prop === 'intensity') d.obj.intensity = d.intensity;
    if (prop === 'x' || prop === 'y' || prop === 'z') d.obj.position.set(d.x, d.y, d.z);
    if (prop === 'dist'  && 'distance' in d.obj) d.obj.distance = d.dist;
    if (prop === 'decay' && 'decay' in d.obj)    d.obj.decay = d.decay;
    if (prop === 'angle' && 'angle' in d.obj)    d.obj.angle = d.angle * _DEG;
    if (prop === 'penumbra' && 'penumbra' in d.obj) d.obj.penumbra = d.penumbra;
    if (d.type === 'area') {
      if (prop === 'width')  { if (d.uniform) d.height = d.width; d.obj.width = d.width; d.obj.height = d.height; }
      if (prop === 'height') { if (d.uniform) d.width = d.height; d.obj.width = d.width; d.obj.height = d.height; }
      if (prop === 'rotX' || prop === 'rotY' || prop === 'rotZ') d.obj.rotation.set(d.rotX * _DEG, d.rotY * _DEG, d.rotZ * _DEG);
      _rlmSyncAreaPlane(d);
      if (d.uniform && (prop === 'width' || prop === 'height')) { _rlmRenderLights(); return; }
    }
    var lab = document.getElementById('rlm-light-' + id + '-' + prop + '-val');
    if (lab) lab.textContent = (typeof v === 'string' && isNaN(parseFloat(v))) ? v : parseFloat(v).toFixed(2);
  };
  window.rlmAreaUniform   = function (id, on) { var d = _rlmFindLight(id); if (!d) return; d.uniform = !!on; if (d.uniform) { d.height = d.width; d.obj.height = d.height; _rlmSyncAreaPlane(d); _rlmRenderLights(); } };
  window.rlmAreaShowPlane = function (id, on) { var d = _rlmFindLight(id); if (!d) return; d.showPlane = !!on; _rlmSyncAreaPlane(d); };
  window.rlmAreaShowNull  = function (id, on) { var d = _rlmFindLight(id); if (!d) return; d.showNull = !!on; _rlmRebuildGizmos(); };
  function _rlmSyncAreaPlane(d) {
    if (d.type !== 'area') return;
    var want = d.enabled && d.showPlane;
    if (want && !d.plane) {
      d.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }));
      d.plane.renderOrder = 995; T.scene.add(d.plane);
    }
    if (d.plane) {
      d.plane.visible = want;
      d.plane.position.copy(d.obj.position);
      d.plane.quaternion.copy(d.obj.quaternion);
      d.plane.scale.set(d.obj.width || 1, d.obj.height || 1, 1);
      if (d.obj.color) d.plane.material.color.copy(d.obj.color);
    }
  }
  /* ── UI row builders (Artwork-style) ── */
  var _L_ICON = { ambient:'A', hemisphere:'◐', directional:'☀', point:'•', spot:'▽', area:'▭' };
  var _L_NAME = { ambient:'Ambient', hemisphere:'Hemisphere', directional:'Directional (Sun)', point:'Point', spot:'Spot', area:'Area (Rect)' };
  function _slider(id, prop, min, max, step, val, unit) {
    return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">' +
      '<span style="width:66px;font-size:10px;color:var(--secondary);">' + prop + '</span>' +
      '<input type="range" class="test-slider" style="flex:1" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" ' +
      'oninput="rlmLightProp(' + id + ',\'' + prop + '\',this.value)">' +
      '<span id="rlm-light-' + id + '-' + prop + '-val" style="width:38px;font-size:10px;text-align:right;">' + Number(val).toFixed(2) + (unit || '') + '</span></div>';
  }
  function _colorRow(id, prop, label, val) {
    return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><span style="width:66px;font-size:10px;color:var(--secondary);">' + label + '</span>' +
      '<input type="color" value="' + val + '" oninput="rlmLightProp(' + id + ',\'' + prop + '\',this.value)" style="flex:1;height:22px;border:none;background:none;cursor:pointer;"></div>';
  }
  function _checkRow(id, fn, label, on) {
    return '<label style="display:flex;align-items:center;gap:6px;margin:6px 0;font-size:10px;cursor:pointer;"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="' + fn + '(' + id + ',this.checked)"><span>' + label + '</span></label>';
  }
  function _rlmRenderLights() {
    var box = document.getElementById('rlm-lights-list'); if (!box) return;
    if (!_rlmLights.length) { box.innerHTML = '<div style="font-size:10px;color:var(--secondary);padding:6px 2px;">No lights yet — click “+ Add Light Layer”.</div>'; return; }
    box.innerHTML = _rlmLights.map(function (d) {
      var maxI = d.type === 'area' ? 30 : ((d.type === 'ambient' || d.type === 'hemisphere') ? 3 : 6);
      var head = '<div style="display:flex;align-items:center;gap:7px;padding:7px 8px;">' +
        '<span style="width:22px;height:22px;border-radius:5px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;">' + (_L_ICON[d.type] || '◆') + '</span>' +
        '<span style="flex:1;font-size:11px;font-weight:600;">' + (_L_NAME[d.type] || d.type) + ' #' + d.id + '</span>' +
        '<button title="on/off" onclick="rlmToggleLight(' + d.id + ')" style="border:none;background:transparent;cursor:pointer;font-size:13px;line-height:1;opacity:' + (d.enabled ? '1' : '0.4') + ';">' + (d.enabled ? '👁' : '⊘') + '</button>' +
        '<button title="delete" onclick="rlmRemoveLight(' + d.id + ')" style="border:none;background:transparent;color:#c0392b;cursor:pointer;font-size:12px;line-height:1;">🗑</button>' +
        '<button title="expand/collapse" onclick="rlmExpandLight(' + d.id + ')" style="border:none;background:transparent;cursor:pointer;font-size:10px;line-height:1;display:inline-block;transition:transform .15s;transform:rotate(' + (d.expanded ? 90 : 0) + 'deg);">▶</button>' +
        '</div>';
      var body = '';
      if (d.expanded) {
        body = '<div style="padding:2px 9px 9px;border-top:1px solid var(--border);">';
        if (d.type === 'hemisphere') body += _colorRow(d.id, 'skyColor', 'sky', d.skyColor) + _colorRow(d.id, 'groundColor', 'ground', d.groundColor);
        else body += _colorRow(d.id, 'color', 'color', d.color);
        body += _slider(d.id, 'intensity', 0, maxI, 0.05, d.intensity);
        if (d.type !== 'ambient' && d.type !== 'hemisphere')
          body += _slider(d.id, 'x', -12, 12, 0.1, d.x) + _slider(d.id, 'y', -12, 12, 0.1, d.y) + _slider(d.id, 'z', -12, 12, 0.1, d.z);
        if (d.type === 'point' || d.type === 'spot') body += _slider(d.id, 'dist', 0, 60, 0.5, d.dist) + _slider(d.id, 'decay', 0, 3, 0.05, d.decay);
        if (d.type === 'spot') body += _slider(d.id, 'angle', 5, 85, 1, d.angle) + _slider(d.id, 'penumbra', 0, 1, 0.02, d.penumbra);
        if (d.type === 'area') {
          body += _slider(d.id, 'width', 0.2, 14, 0.1, d.width) + _slider(d.id, 'height', 0.2, 14, 0.1, d.height) +
                  _checkRow(d.id, 'rlmAreaUniform', 'Link width/height (uniform)', d.uniform) +
                  _slider(d.id, 'rotX', -180, 180, 1, d.rotX) + _slider(d.id, 'rotY', -180, 180, 1, d.rotY) + _slider(d.id, 'rotZ', -180, 180, 1, d.rotZ) +
                  _checkRow(d.id, 'rlmAreaShowPlane', 'Show emissive plane (the panel)', d.showPlane) +
                  _checkRow(d.id, 'rlmAreaShowNull', 'Show null gizmo', d.showNull);
        }
        body += '</div>';
      }
      return '<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:7px;overflow:hidden;' + (d.enabled ? '' : 'opacity:0.55;') + '">' + head + body + '</div>';
    }).join('');
  }
  window._rlmRenderLights = _rlmRenderLights;

  /* ───────────────────────── LIGHT GIZMOS (3D nulls) ──────────────────────── */
  var _rlmGizmoOn = false;
  var _rlmGizmoGroup = null;
  var _rlmGizmoItems = [];
  var _rlmZero = new THREE.Vector3(0, 0, 0);
  var _rlmLineColor = 0x444444;     /* gizmo direction-line / rect colour (user-tunable) */
  var _rlmLineOpacity = 0.75;
  function _rlmGizmoEntries() {
    var arr = [];
    if (T.keyLight)  arr.push({ obj: T.keyLight,  def: null });
    if (T.fillLight) arr.push({ obj: T.fillLight, def: null });
    if (T.rimLight)  arr.push({ obj: T.rimLight,  def: null });
    _rlmLights.forEach(function (d) { if (d.obj) arr.push({ obj: d.obj, def: d }); });
    return arr;
  }
  /* an area light's null follows its own per-light toggle; everything else follows the global */
  function _rlmGizmoVisFor(it) {
    if (it.def && it.def.type === 'area') return !!(it.def.enabled && it.def.showNull);
    return _rlmGizmoOn;
  }
  function _rlmBuildGizmos() {
    if (!T.scene) return;
    if (!_rlmGizmoGroup) { _rlmGizmoGroup = new THREE.Group(); _rlmGizmoGroup.name = 'rlmGizmos'; T.scene.add(_rlmGizmoGroup); }
    while (_rlmGizmoGroup.children.length) {
      var c = _rlmGizmoGroup.children[0]; _rlmGizmoGroup.remove(c);
      if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose();
    }
    _rlmGizmoItems = [];
    _rlmGizmoEntries().forEach(function (e) {
      var lt = e.obj, col = lt.color ? lt.color.getHex() : 0xffdd55;
      /* dark outline shell so white lights stay visible on a white backdrop */
      var outline = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide, depthTest: false, transparent: true }));
      outline.renderOrder = 996; _rlmGizmoGroup.add(outline);
      var sph = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 16),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true }));
      sph.renderOrder = 998; _rlmGizmoGroup.add(sph);
      var line = null;
      if (lt.isDirectionalLight || lt.isSpotLight) {
        var lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: _rlmLineColor, depthTest: false, transparent: true, opacity: _rlmLineOpacity }));
        line.renderOrder = 997; _rlmGizmoGroup.add(line);
      }
      var rect = null;
      if (lt.isRectAreaLight) {
        var rg = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.5, -0.5, 0), new THREE.Vector3(0.5, -0.5, 0),
          new THREE.Vector3(0.5, 0.5, 0), new THREE.Vector3(-0.5, 0.5, 0)
        ]);
        rect = new THREE.LineLoop(rg, new THREE.LineBasicMaterial({ color: _rlmLineColor, depthTest: false, transparent: true, opacity: _rlmLineOpacity }));
        rect.renderOrder = 997; _rlmGizmoGroup.add(rect);
      }
      _rlmGizmoItems.push({ light: lt, def: e.def, mesh: sph, outline: outline, line: line, rect: rect });
    });
    _rlmGizmoGroup.visible = true;
    _rlmApplyGizmoVis();
    _rlmUpdateGizmos();
  }
  function _rlmApplyGizmoVis() {
    for (var i = 0; i < _rlmGizmoItems.length; i++) {
      var it = _rlmGizmoItems[i], vis = _rlmGizmoVisFor(it);
      if (it.mesh) it.mesh.visible = vis;
      if (it.outline) it.outline.visible = vis;
      if (it.line) it.line.visible = vis;
      if (it.rect) it.rect.visible = vis;
    }
  }
  function _rlmUpdateGizmos() {
    if (!_rlmGizmoGroup) return;
    for (var i = 0; i < _rlmGizmoItems.length; i++) {
      var it = _rlmGizmoItems[i]; if (!it.light) continue;
      it.mesh.position.copy(it.light.position);
      if (it.outline) it.outline.position.copy(it.light.position);
      if (it.light.color) it.mesh.material.color.copy(it.light.color);
      if (it.line) {
        var tgt = (it.light.target && it.light.target.position) ? it.light.target.position : _rlmZero;
        var pa = it.line.geometry.attributes.position;
        pa.setXYZ(0, it.light.position.x, it.light.position.y, it.light.position.z);
        pa.setXYZ(1, tgt.x, tgt.y, tgt.z);
        pa.needsUpdate = true;
      }
      if (it.rect) {
        it.rect.position.copy(it.light.position);
        it.rect.quaternion.copy(it.light.quaternion);
        it.rect.scale.set(it.light.width || 1, it.light.height || 1, 1);
      }
    }
  }
  function _rlmRebuildGizmos() {
    var anyArea = _rlmLights.some(function (d) { return d.type === 'area' && d.enabled && d.showNull; });
    if (_rlmGizmoOn || anyArea || _rlmGizmoGroup) _rlmBuildGizmos();
  }
  window._rlmUpdateGizmos  = _rlmUpdateGizmos;
  window._rlmRebuildGizmos = _rlmRebuildGizmos;
  /* Coloured sphere at each light's position (built-ins + custom); line to target for
     sun/spot; rect outline for area. Global toggle covers all; area lights also have
     their own per-light null toggle. */
  window.rlmToggleGizmos = function (c) {
    _rlmGizmoOn = !!c;
    if (!_rlmGizmoGroup) _rlmBuildGizmos(); else _rlmApplyGizmoVis();
  };
  window.rlmSetLineColor = function (v) {
    _rlmLineColor = (typeof v === 'string') ? parseInt(v.replace('#', ''), 16) : v;
    _rlmGizmoItems.forEach(function (it) { if (it.line) it.line.material.color.setHex(_rlmLineColor); if (it.rect) it.rect.material.color.setHex(_rlmLineColor); });
  };
  window.rlmSetLineOpacity = function (v) {
    _rlmLineOpacity = parseFloat(v); _val('rlm-line-op-val', _rlmLineOpacity.toFixed(2));
    _rlmGizmoItems.forEach(function (it) { if (it.line) it.line.material.opacity = _rlmLineOpacity; if (it.rect) it.rect.material.opacity = _rlmLineOpacity; });
  };

  /* ─────────────────────────── PERFORMANCE HUD ────────────────────────────── */
  var _rlmPerf = { on:false, fps:true, frameMs:true, mobile:true, draws:true, tris:false, ping:true,
    _last:0, _ema:0, _lastDom:0, _hud:null, _ping:0, _pingAt:0, _MOBILE_MULT:3.5 };
  function _rlmPerfHud() {
    if (_rlmPerf._hud) return _rlmPerf._hud;
    var el = document.createElement('div');
    el.id = 'rlm-perf-hud';
    el.style.cssText = 'position:absolute;top:10px;left:10px;z-index:40;background:rgba(15,15,18,0.72);color:#eef;font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;padding:7px 10px;border-radius:8px;pointer-events:none;white-space:pre;letter-spacing:0.3px;';
    var host = (T.renderer && T.renderer.domElement && T.renderer.domElement.parentElement) || document.body;
    try { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; } catch (e) {}
    host.appendChild(el);
    _rlmPerf._hud = el; return el;
  }
  function _rlmPingMeasure() {
    try {
      var t0 = performance.now();
      fetch(location.pathname + '?_ping=' + Math.floor(t0), { method: 'HEAD', cache: 'no-store' })
        .then(function () { _rlmPerf._ping = performance.now() - t0; })
        .catch(function () { _rlmPerf._ping = 0; });
    } catch (e) {}
  }
  function _rlmPerfTick() {
    var p = _rlmPerf; if (!p.on) return;
    var t = (typeof performance !== 'undefined') ? performance.now() : 0;
    if (p._last) { var dt = t - p._last; p._ema = p._ema ? (p._ema * 0.9 + dt * 0.1) : dt; }
    p._last = t;
    if (p.ping && (t - p._pingAt > 3000)) { p._pingAt = t; _rlmPingMeasure(); }
    if (t - p._lastDom < 250) return;     /* refresh the readout ~4×/sec */
    p._lastDom = t;
    var el = p._hud || _rlmPerfHud();
    var ms = p._ema || 0, fps = ms > 0 ? Math.min(120, 1000 / ms) : 0;
    var mob = ms > 0 ? Math.min(60, 1000 / (ms * p._MOBILE_MULT)) : 0;
    var info = (T.renderer && T.renderer.info) ? T.renderer.info.render : null;
    var L = [];
    if (p.fps)     L.push('FPS      ' + fps.toFixed(0));
    if (p.frameMs) L.push('frame    ' + ms.toFixed(1) + ' ms');
    if (p.mobile)  L.push('mobile~  ' + mob.toFixed(0) + ' fps');
    if (p.draws && info) L.push('draws    ' + info.calls);
    if (p.tris && info)  L.push('tris     ' + (info.triangles >= 1000 ? (info.triangles / 1000).toFixed(1) + 'k' : info.triangles));
    if (p.ping)    L.push('ping     ' + (p._ping ? p._ping.toFixed(0) + ' ms' : '…'));
    el.textContent = L.join('\n');
  }
  window.onPerfToggle = function (c) { _rlmPerf.on = !!c; var el = _rlmPerfHud(); el.style.display = c ? 'block' : 'none'; if (c) { _rlmPerf._last = 0; _rlmPerf._lastDom = 0; _rlmPerfTick(); } };
  window.onPerfStat   = function (key, c) { _rlmPerf[key] = !!c; };

  /* ─────────────────────── PER-FINISH MATERIAL + CUSTOM MAPS ──────────────────
     One collapsible card per finish preset (matte / soft-touch / gloss / kraft /
     foil). Each holds roughness/metalness/transmission + custom maps. Maps are an
     OVERRIDE layer: a slot is only changed while that finish has an image for it,
     so the normal colour/pattern/grain pipeline is untouched otherwise.
     • albedo  → composited over the colour canvas (blend mode + opacity)
     • normal/roughness/metalness/ao → baked to a tiled texture & assigned to the slot */
  var _MAP_TYPES = ['albedo', 'normal', 'roughness', 'metalness', 'ao', 'bump', 'displacement'];
  var _BLENDS = ['source-over', 'multiply', 'darken', 'lighten', 'screen', 'overlay', 'soft-light', 'difference'];
  var _BLEND_LABEL = { 'source-over':'Normal', 'multiply':'Multiply', 'darken':'Darken', 'lighten':'Lighten', 'screen':'Screen', 'overlay':'Overlay', 'soft-light':'Soft Light', 'difference':'Difference' };
  var _rlmFinishMaps = {};     /* key → { tile, albedo:{img,opacity,blend,name}, normal/roughness/metalness/ao:{img,strength,name} } */
  var _rlmFinishOpen = {};
  function _rlmFinishKeys() { try { return Object.keys(BAG_FINISH_PRESETS); } catch (e) { return ['matte','softtouch','gloss','kraft','foil']; } }
  function _rlmFm(key) {
    if (!_rlmFinishMaps[key]) _rlmFinishMaps[key] = { tile: 1,
      albedo: { img:null, opacity:1, blend:'source-over', invert:false, name:'' },
      normal: { img:null, strength:1, invert:false, name:'' }, roughness: { img:null, strength:1, invert:false, name:'' },
      metalness: { img:null, strength:1, invert:false, name:'' }, ao: { img:null, strength:1, invert:false, name:'' },
      bump: { img:null, strength:0.02, invert:false, name:'' }, displacement: { img:null, strength:0.05, invert:false, name:'' } };
    return _rlmFinishMaps[key];
  }
  function _activeFinish() { try { return BAG.exterior.finish; } catch (e) { return null; } }
  function _ensureUV2() {
    try { if (bagMeshRef && bagMeshRef.geometry && bagMeshRef.geometry.attributes.uv && !bagMeshRef.geometry.attributes.uv2)
      bagMeshRef.geometry.setAttribute('uv2', bagMeshRef.geometry.attributes.uv); } catch (e) {}
  }
  /* draw an image tiled n× into a canvas (optionally over a flat fill, at a given alpha) → CanvasTexture */
  function _bakeTiled(img, tile, fillStyle, alpha, invert) {
    var S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var ctx = cv.getContext('2d');
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fillRect(0, 0, S, S); }   /* flat base (NOT inverted) */
    ctx.globalAlpha = (alpha == null ? 1 : alpha);
    if (invert) ctx.filter = 'invert(1)';                                     /* Photoshop Cmd+I on the map only */
    var n = Math.max(1, Math.round(tile || 1));
    try { var pat = ctx.createPattern(img, 'repeat'); var s = S / (n * img.width); ctx.save(); ctx.scale(s, s); ctx.fillStyle = pat; ctx.fillRect(0, 0, S / s, S / s); ctx.restore(); } catch (e) {}
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    var t = new THREE.CanvasTexture(cv); t.anisotropy = _aniso(); t.needsUpdate = true; return t;
  }
  var _grayHex = function (v) { var g = Math.max(0, Math.min(255, Math.round(v * 255))); var h = g.toString(16); if (h.length < 2) h = '0' + h; return '#' + h + h + h; };

  /* apply a finish's NORMAL/ROUGHNESS/METALNESS/AO overrides to the live material */
  window.applyFinishCustomMaps = function (key) {
    if (!bagMeshRef) return;
    if (key && _activeFinish() && key !== _activeFinish()) return;   /* only the active finish drives the material */
    key = _activeFinish(); if (!key) return;
    var m = bagMeshRef.material, fm = _rlmFm(key), preset = (BAG_FINISH_PRESETS && BAG_FINISH_PRESETS[key]) || {};
    // NORMAL
    if (fm.normal.img) { m.normalMap = _bakeTiled(fm.normal.img, fm.tile, null, 1, fm.normal.invert); if (!m.normalScale) m.normalScale = new THREE.Vector2(1,1); m.normalScale.set(fm.normal.strength, fm.normal.strength); }
    else if (typeof paperNormalTex !== 'undefined' && paperNormalTex) { m.normalMap = paperNormalTex; }   /* default: paper grain */
    // ROUGHNESS (lerp flat↔map by strength, baked into a gray canvas)
    if (fm.roughness.img) { m.roughnessMap = _bakeTiled(fm.roughness.img, fm.tile, _grayHex(preset.roughness != null ? preset.roughness : 0.6), fm.roughness.strength, fm.roughness.invert); m.roughness = 1.0; }
    else if (typeof bagRoughTex !== 'undefined' && bagRoughTex) { m.roughnessMap = bagRoughTex; }
    // METALNESS
    if (fm.metalness.img) { m.metalnessMap = _bakeTiled(fm.metalness.img, fm.tile, _grayHex(preset.metalness != null ? preset.metalness : 0), fm.metalness.strength, fm.metalness.invert); m.metalness = 1.0; }
    else if (typeof bagMetalTex !== 'undefined' && bagMetalTex) { m.metalnessMap = bagMetalTex; }
    // AO
    if (fm.ao.img) { _ensureUV2(); m.aoMap = _bakeTiled(fm.ao.img, fm.tile, null, 1, fm.ao.invert); m.aoMapIntensity = fm.ao.strength; }
    else { m.aoMap = null; }
    // BUMP (overrides the emboss bump slot while present)
    if (fm.bump.img) { m.bumpMap = _bakeTiled(fm.bump.img, fm.tile, null, 1, fm.bump.invert); m.bumpScale = fm.bump.strength; }
    else if (typeof bagBumpTex !== 'undefined' && bagBumpTex) { m.bumpMap = bagBumpTex; }
    // DISPLACEMENT (subtle on this low-poly mesh, but supported)
    if (fm.displacement.img) { m.displacementMap = _bakeTiled(fm.displacement.img, fm.tile, null, 1, fm.displacement.invert); m.displacementScale = fm.displacement.strength; }
    else { m.displacementMap = null; m.displacementScale = 0; }
    m.needsUpdate = true;
  };

  /* composite the active finish's ALBEDO over the colour canvas — called at the end of
     drawBagTexture (guarded no-op when there's no albedo, so the core pipeline is safe) */
  window.applyFinishAlbedo = function () {
    try {
      var key = _activeFinish(); if (!key) return;
      var fm = _rlmFinishMaps[key]; if (!fm || !fm.albedo.img) return;
      if (typeof bagTexCanvas === 'undefined' || !bagTexCanvas) return;
      var ctx = bagTexCanvas.getContext('2d'), S = bagTexCanvas.width, img = fm.albedo.img;
      ctx.save();
      ctx.globalCompositeOperation = fm.albedo.blend || 'source-over';
      ctx.globalAlpha = (fm.albedo.opacity == null ? 1 : fm.albedo.opacity);
      if (fm.albedo.invert) ctx.filter = 'invert(1)';
      var n = Math.max(1, Math.round(fm.tile || 1));
      var pat = ctx.createPattern(img, 'repeat'); var s = S / (n * img.width);
      ctx.scale(s, s); ctx.fillStyle = pat; ctx.fillRect(0, 0, S / s, S / s);
      ctx.restore();
      if (typeof bagTexture !== 'undefined' && bagTexture) bagTexture.needsUpdate = true;
    } catch (e) {}
  };

  /* DEFAULT PAPER MATERIAL: load a committed albedo + normal and apply to ALL
     finishes as an override. Gated on the albedo loading, so a missing diffuse
     file is a safe no-op (finishes are left untouched, no regression). */
  var _rlmDefaultPaperDone = false;
  function _rlmApplyDefaultPaperFinish() {
    if (_rlmDefaultPaperDone) return;
    var DIFF = 'materials/paper-2-DIFFUSE.png', DIFF_ALT = 'materials/paper-2-DIFFUSE.jpg';
    var NORM = 'materials/paper-2-NORM.png';
    var alb = new Image(), nrm = new Image(), ready = 0, albOk = false, nrmOk = false;
    function done() {
      if (ready < 2 || !albOk) return;   /* require the albedo; otherwise leave finishes as-is */
      _rlmDefaultPaperDone = true;
      _rlmFinishKeys().forEach(function (key) {
        var fm = _rlmFm(key);
        fm.tile = 8.0;
        fm.albedo.img = alb; fm.albedo.opacity = 0.45; fm.albedo.blend = 'multiply'; fm.albedo.invert = false; fm.albedo.name = 'paper-2-DIFFUSE';
        if (nrmOk) { fm.normal.img = nrm; fm.normal.name = 'paper-2-NORM.png'; }
        fm.normal.strength = 0.2; fm.normal.invert = false;
      });
      var act = _activeFinish();
      try { applyFinishCustomMaps(act); } catch (e) {}
      try { if (typeof drawBagTexture === 'function') drawBagTexture(); } catch (e) {}
      try { _rlmRenderFinishMaps(); } catch (e) {}
    }
    alb.onload  = function () { albOk = true; ready++; done(); };
    alb.onerror = function () { if (alb.src.indexOf(DIFF_ALT) === -1) { alb.src = DIFF_ALT; return; } ready++; done(); };
    nrm.onload  = function () { nrmOk = true; ready++; done(); };
    nrm.onerror = function () { ready++; done(); };
    alb.src = DIFF; nrm.src = NORM;
  }

  function _rlmFinishUploadImg(file, cb) {
    var rd = new FileReader();
    rd.onload = function () { var im = new Image(); im.onload = function () { cb(im); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  }
  window.rlmFinishUpload = function (key, type, input) {
    var f = input.files && input.files[0]; if (!f) return;
    var fm = _rlmFm(key);
    _rlmFinishUploadImg(f, function (im) {
      fm[type].img = im; fm[type].name = f.name;
      if (type === 'albedo') { if (typeof drawBagTexture === 'function') drawBagTexture(); else applyFinishAlbedo(); }
      else applyFinishCustomMaps(key);
      _rlmRenderFinishMaps();
    });
  };
  window.rlmFinishClear = function (key, type) {
    var fm = _rlmFm(key); fm[type].img = null; fm[type].name = '';
    if (type === 'albedo') { if (typeof drawBagTexture === 'function') drawBagTexture(); }
    else applyFinishCustomMaps(key);
    _rlmRenderFinishMaps();
  };
  window.rlmFinishMapStr = function (key, type, v) {
    var fm = _rlmFm(key); fm[type].strength = parseFloat(v);
    _val('rlm-fm-' + key + '-' + type + '-str', parseFloat(v).toFixed(2));
    applyFinishCustomMaps(key);
  };
  window.rlmFinishMapInvert = function (key, type, on) {
    var fm = _rlmFm(key); fm[type].invert = !!on;
    if (type === 'albedo') { if (typeof drawBagTexture === 'function') drawBagTexture(); }
    else applyFinishCustomMaps(key);
  };
  window.rlmFinishAlbedoOpacity = function (key, v) { var fm = _rlmFm(key); fm.albedo.opacity = parseFloat(v); _val('rlm-fm-' + key + '-albop', parseFloat(v).toFixed(2)); if (typeof drawBagTexture === 'function') drawBagTexture(); };
  window.rlmFinishAlbedoBlend = function (key, v) { var fm = _rlmFm(key); fm.albedo.blend = v; if (typeof drawBagTexture === 'function') drawBagTexture(); };
  window.rlmFinishTile = function (key, v) { var fm = _rlmFm(key); fm.tile = parseFloat(v); _val('rlm-fm-' + key + '-tile', parseFloat(v).toFixed(1)); applyFinishCustomMaps(key); if (typeof drawBagTexture === 'function') drawBagTexture(); };
  window.rlmFinishPBR = function (key, prop, v) {
    try { BAG_FINISH_PRESETS[key][prop] = parseFloat(v); } catch (e) {}
    _val('rlm-fm-' + key + '-' + prop, parseFloat(v).toFixed(2));
    if (_activeFinish() === key && typeof applyBagFinish === 'function') applyBagFinish('exterior', key, null, true);
  };
  window.rlmFinishExpand = function (key) { _rlmFinishOpen[key] = !_rlmFinishOpen[key]; _rlmRenderFinishMaps(); };

  function _mapRow(key, type) {
    var fm = _rlmFm(key), d = fm[type], has = !!d.img;
    var btn = 'padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:10px;cursor:pointer;';
    var id = 'rlm-fm-' + key + '-' + type;
    var h = '<div style="border:1px solid var(--border);border-radius:7px;padding:7px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
      '<span style="flex:1;font-size:11px;text-transform:capitalize;font-weight:600;">' + type + '</span>' +
      '<span style="font-size:9px;color:var(--secondary);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (has ? '✓ ' + d.name.slice(0, 16) : '(none)') + '</span>' +
      '<input type="file" accept="image/*" id="' + id + '-in" style="display:none" onchange="rlmFinishUpload(\'' + key + '\',\'' + type + '\',this)">' +
      '<button style="' + btn + '" onclick="document.getElementById(\'' + id + '-in\').click()">Upload</button>' +
      '<button style="' + btn + 'color:#c0392b;" onclick="rlmFinishClear(\'' + key + '\',\'' + type + '\')">✕</button></div>';
    if (type === 'albedo') {
      var opts = _BLENDS.map(function (b) { return '<option value="' + b + '"' + (b === d.blend ? ' selected' : '') + '>' + _BLEND_LABEL[b] + '</option>'; }).join('');
      h += '<div style="display:flex;align-items:center;gap:6px;margin-top:5px;"><span style="width:62px;font-size:10px;color:var(--secondary);">blend</span>' +
        '<select onchange="rlmFinishAlbedoBlend(\'' + key + '\',this.value)" style="flex:1;font-size:10px;padding:3px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text);">' + opts + '</select></div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span style="width:62px;font-size:10px;color:var(--secondary);">opacity</span>' +
        '<input type="range" class="test-slider" style="flex:1" min="0" max="1" step="0.01" value="' + d.opacity + '" oninput="rlmFinishAlbedoOpacity(\'' + key + '\',this.value)">' +
        '<span id="rlm-fm-' + key + '-albop" style="width:34px;font-size:10px;text-align:right;">' + d.opacity.toFixed(2) + '</span></div>';
    } else {
      var mx = type === 'ao' ? 2 : type === 'normal' ? 3 : type === 'bump' ? 0.1 : type === 'displacement' ? 0.3 : 1;
      var stp = (type === 'bump' || type === 'displacement') ? 0.005 : 0.05;
      h += '<div style="display:flex;align-items:center;gap:6px;margin-top:5px;"><span style="width:62px;font-size:10px;color:var(--secondary);">strength</span>' +
        '<input type="range" class="test-slider" style="flex:1" min="0" max="' + mx + '" step="' + stp + '" value="' + d.strength + '" oninput="rlmFinishMapStr(\'' + key + '\',\'' + type + '\',this.value)">' +
        '<span id="' + id + '-str" style="width:34px;font-size:10px;text-align:right;">' + Number(d.strength).toFixed(2) + '</span></div>';
    }
    h += '<label style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:10px;cursor:pointer;"><input type="checkbox" ' + (d.invert ? 'checked' : '') + ' onchange="rlmFinishMapInvert(\'' + key + '\',\'' + type + '\',this.checked)"><span>invert colors (Cmd+I)</span></label>';
    return h + '</div>';
  }
  function _pbrSlider(key, prop, max) {
    var p = (BAG_FINISH_PRESETS && BAG_FINISH_PRESETS[key]) ? (BAG_FINISH_PRESETS[key][prop] || 0) : 0;
    return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><span style="width:80px;font-size:10px;color:var(--secondary);">' + prop + '</span>' +
      '<input type="range" class="test-slider" style="flex:1" min="0" max="' + max + '" step="0.01" value="' + p + '" oninput="rlmFinishPBR(\'' + key + '\',\'' + prop + '\',this.value)">' +
      '<span id="rlm-fm-' + key + '-' + prop + '" style="width:34px;font-size:10px;text-align:right;">' + Number(p).toFixed(2) + '</span></div>';
  }
  function _rlmRenderFinishMaps() {
    var box = document.getElementById('rlm-maps-rows'); if (!box) return;
    var names = { matte:'Matte', softtouch:'Soft Touch', gloss:'Gloss', kraft:'Kraft', foil:'Foil' };
    box.innerHTML = _rlmFinishKeys().map(function (key) {
      var open = !!_rlmFinishOpen[key], fm = _rlmFm(key);
      var nUsed = _MAP_TYPES.filter(function (t) { return fm[t].img; }).length;
      var head = '<div onclick="rlmFinishExpand(\'' + key + '\')" style="display:flex;align-items:center;gap:8px;padding:8px 9px;cursor:pointer;">' +
        '<span style="flex:1;font-size:11px;font-weight:700;">' + (names[key] || key) + '</span>' +
        (nUsed ? '<span style="font-size:9px;color:var(--accent);">' + nUsed + ' map' + (nUsed > 1 ? 's' : '') + '</span>' : '') +
        '<span style="font-size:10px;display:inline-block;transition:transform .15s;transform:rotate(' + (open ? 90 : 0) + 'deg);">▶</span></div>';
      var body = '';
      if (open) {
        body = '<div style="padding:2px 9px 9px;border-top:1px solid var(--border);">' +
          _pbrSlider(key, 'roughness', 1) + _pbrSlider(key, 'metalness', 1) + _pbrSlider(key, 'transmission', 1) +
          '<div style="display:flex;align-items:center;gap:6px;margin:6px 0 4px;"><span style="width:80px;font-size:10px;color:var(--secondary);">map tiling</span>' +
          '<input type="range" class="test-slider" style="flex:1" min="1" max="60" step="1" value="' + fm.tile + '" oninput="rlmFinishTile(\'' + key + '\',this.value)">' +
          '<span id="rlm-fm-' + key + '-tile" style="width:34px;font-size:10px;text-align:right;">' + Number(fm.tile).toFixed(1) + '</span></div>' +
          _MAP_TYPES.map(function (t) { return _mapRow(key, t); }).join('') + '</div>';
      }
      return '<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:7px;overflow:hidden;">' + head + body + '</div>';
    }).join('');
  }
  window._rlmRenderMapRows = _rlmRenderFinishMaps;
  window._rlmRenderFinishMaps = _rlmRenderFinishMaps;
  window._rlmFinishMapsState = function () { return _rlmFinishMaps; };   /* used by Export Defaults */

  /* ─────────────────────────── EXPORT / APPLY DEFAULTS ─────────────────────────
     Capture the whole material/render/lighting setup (incl. per-finish custom maps
     as data-URLs) → download a JSON + save to localStorage. On the next load the
     saved values are applied EARLY (before the scene + bag finish are built), so they
     simply become the new defaults. */
  /* Bake current defaults permanently into the code: paste a _gatherDefaults() JSON
     here and it becomes the in-source default (takes priority over localStorage). */
  var EMBEDDED_DEFAULTS = null;
  function _imgSrc(img) { try { return (img && img.src) ? img.src : null; } catch (e) { return null; } }
  function _serializeFinishMaps() {
    var out = {};
    Object.keys(_rlmFinishMaps).forEach(function (k) {
      var f = _rlmFinishMaps[k]; out[k] = { tile: f.tile };
      _MAP_TYPES.forEach(function (t) {
        var d = f[t]; if (!d) return;
        out[k][t] = { src: _imgSrc(d.img), name: d.name, invert: !!d.invert };
        if (t === 'albedo') { out[k][t].opacity = d.opacity; out[k][t].blend = d.blend; }
        else out[k][t].strength = d.strength;
      });
    });
    return out;
  }
  function _gatherDefaults() {
    var d = { v: 1, realism: JSON.parse(JSON.stringify(REALISM)), finishMaps: _serializeFinishMaps(),
      gizmoLineColor: _rlmLineColor, gizmoLineOpacity: _rlmLineOpacity };
    try { d.presets = JSON.parse(JSON.stringify(BAG_FINISH_PRESETS)); } catch (e) {}
    try { d.hdriIntensity = hdriBaseIntensity; } catch (e) {}
    d.lights = _rlmLights.map(function (L) {
      return { type: L.type, enabled: L.enabled, color: L.color, intensity: L.intensity, skyColor: L.skyColor, groundColor: L.groundColor,
        x: L.x, y: L.y, z: L.z, dist: L.dist, decay: L.decay, angle: L.angle, penumbra: L.penumbra,
        width: L.width, height: L.height, rotX: L.rotX, rotY: L.rotY, rotZ: L.rotZ, uniform: L.uniform, showPlane: L.showPlane, showNull: L.showNull };
    });
    return d;
  }
  window.rlmExportDefaults = function () {
    var d = _gatherDefaults();
    try { localStorage.setItem('imprint_defaults', JSON.stringify(d)); } catch (e) {}
    try {
      var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'imprint-defaults.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) {}
    var s = document.getElementById('rlm-export-status'); if (s) s.textContent = '✓ Saved as defaults + downloaded imprint-defaults.json';
  };
  window.rlmResetDefaults = function () {
    try { localStorage.removeItem('imprint_defaults'); } catch (e) {}
    var s = document.getElementById('rlm-export-status'); if (s) s.textContent = 'Cleared saved defaults — reload to use built-in defaults.';
  };
  /* applied at the START of initRealismScene, before the scene/material read REALISM */
  window.rlmApplyDefaults = function (d) {
    if (!d) { try { d = EMBEDDED_DEFAULTS || JSON.parse(localStorage.getItem('imprint_defaults') || 'null'); } catch (e) { d = EMBEDDED_DEFAULTS || null; } }
    if (!d) return;
    try {
      if (d.realism) Object.keys(d.realism).forEach(function (k) { REALISM[k] = d.realism[k]; });
      if (d.presets) try { Object.keys(d.presets).forEach(function (k) { if (BAG_FINISH_PRESETS[k]) Object.assign(BAG_FINISH_PRESETS[k], d.presets[k]); }); } catch (e) {}
      if (d.hdriIntensity != null) try { hdriBaseIntensity = d.hdriIntensity; } catch (e) {}
      if (d.gizmoLineColor != null) _rlmLineColor = d.gizmoLineColor;
      if (d.gizmoLineOpacity != null) _rlmLineOpacity = d.gizmoLineOpacity;
      if (d.finishMaps) Object.keys(d.finishMaps).forEach(function (k) {
        var sd = d.finishMaps[k], fm = _rlmFm(k); fm.tile = sd.tile;
        _MAP_TYPES.forEach(function (t) {
          var md = sd[t]; if (!md || !fm[t]) return;
          if (t === 'albedo') { fm.albedo.opacity = md.opacity; fm.albedo.blend = md.blend; } else { fm[t].strength = md.strength; }
          if (md.invert != null) fm[t].invert = md.invert;
          fm[t].name = md.name || '';
          if (md.src) { var im = new Image(); im.onload = (function (kk, tt) { return function () { if (_activeFinish() === kk) { if (tt === 'albedo') { if (typeof drawBagTexture === 'function') drawBagTexture(); } else applyFinishCustomMaps(kk); } }; })(k, t); im.src = md.src; fm[t].img = im; }
        });
      });
      if (d.lights && d.lights.length && typeof rlmAddLight === 'function') {
        d.lights.forEach(function (ld) {
          rlmAddLight(ld.type); var def = _rlmLights[_rlmLights.length - 1]; if (!def) return;
          ['enabled','color','intensity','skyColor','groundColor','x','y','z','dist','decay','angle','penumbra','width','height','rotX','rotY','rotZ','uniform','showPlane','showNull'].forEach(function (p) { if (ld[p] != null) def[p] = ld[p]; });
          var o = def.obj; o.intensity = def.intensity; if (o.color) o.color.set(def.type === 'hemisphere' ? def.skyColor : def.color);
          if (o.groundColor && def.groundColor) o.groundColor.set(def.groundColor);
          if (def.type !== 'ambient' && def.type !== 'hemisphere') o.position.set(def.x, def.y, def.z);
          if ('distance' in o) o.distance = def.dist; if ('decay' in o) o.decay = def.decay;
          if ('angle' in o) o.angle = def.angle * _DEG; if ('penumbra' in o) o.penumbra = def.penumbra;
          if (def.type === 'area') { o.width = def.width; o.height = def.height; o.rotation.set(def.rotX * _DEG, def.rotY * _DEG, def.rotZ * _DEG); _rlmSyncAreaPlane(def); }
          o.visible = def.enabled !== false;
        });
        _rlmRenderLights();
      }
    } catch (e) { console.warn('[realism] applyDefaults', e); }
  };
})();
