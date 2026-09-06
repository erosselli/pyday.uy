import * as THREE from 'three';

function initHeroSnake() {
  var canvas = document.getElementById('snake-canvas');
  var fallback = document.getElementById('hero-fallback');
  var hero = canvas ? canvas.closest('.hero') : null;
  if (!canvas || !hero) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // static #hero-fallback grid stands in

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ---------- grid/snake state ----------

  var cols = 16, rows = 8, snake, dir, food;
  var acc = 0;
  var stepMs = 130;

  function initGrid() {
    var sy = Math.floor(rows / 2);
    snake = [
      { x: 3, y: sy },
      { x: 2, y: sy },
      { x: 1, y: sy }
    ];
    dir = { x: 1, y: 0 };
    placeFood();
  }

  function placeFood() {
    var tries = 0;
    while (tries < 200) {
      var fx = Math.floor(Math.random() * cols);
      var fy = Math.floor(Math.random() * rows);
      var hit = snake && snake.some(function (s) { return s.x === fx && s.y === fy; });
      if (!hit) { food = { x: fx, y: fy }; return; }
      tries++;
    }
    food = { x: 0, y: 0 };
  }

  function chooseDir() {
    if (!snake || !snake.length) return;
    var head = snake[0];
    var options = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ].filter(function (d) {
      return !(d.x === -dir.x && d.y === -dir.y);
    });

    function wrap(v, max) { return (v + max) % max; }

    function dist(a) {
      var nx = wrap(head.x + a.x, cols);
      var ny = wrap(head.y + a.y, rows);
      var dx = Math.min(Math.abs(nx - food.x), cols - Math.abs(nx - food.x));
      var dy = Math.min(Math.abs(ny - food.y), rows - Math.abs(ny - food.y));
      return dx + dy;
    }

    function isSafe(a) {
      var nx = wrap(head.x + a.x, cols);
      var ny = wrap(head.y + a.y, rows);
      return !snake.some(function (s, i) { return i < snake.length - 1 && s.x === nx && s.y === ny; });
    }

    var safe = options.filter(isSafe);
    var pool = safe.length ? safe : options;
    pool.sort(function (a, b) { return dist(a) - dist(b); });
    dir = pool[0];
  }

  function step() {
    if (!snake || !snake.length) return;
    chooseDir();
    var head = snake[0];
    var nx = (head.x + dir.x + cols) % cols;
    var ny = (head.y + dir.y + rows) % rows;
    snake.unshift({ x: nx, y: ny });
    if (food && nx === food.x && ny === food.y) {
      placeFood();
      if (snake.length > cols * rows * 0.6) initGrid();
    } else {
      snake.pop();
    }
  }

  // ---------- three.js scene ----------

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // leave the static fallback grid visible
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var world = new THREE.Group();
  scene.add(world);

  var maxInstances = 60;
  var boxGeo = new THREE.BoxGeometry(0.8, 0.62, 0.8);
  var segmentMeshes = [];
  for (var mi = 0; mi < maxInstances; mi++) {
    var segMesh = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    segMesh.visible = false;
    world.add(segMesh);
    segmentMeshes.push(segMesh);
  }

  var foodGeo = new THREE.SphereGeometry(0.2, 14, 14);
  var foodMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var foodMesh = new THREE.Mesh(foodGeo, foodMat);
  world.add(foodMesh);

  var gridMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.65 });
  var gridLines = null;

  var colorHead = new THREE.Color();
  var colorTail = new THREE.Color();

  var span = 10;
  var camBase = { x: 0, y: 9, z: 9.5 };

  function buildGrid() {
    if (gridLines) {
      world.remove(gridLines);
      gridLines.geometry.dispose();
    }
    var pts = [];
    for (var gx = 0; gx <= cols; gx++) pts.push(gx, 0, 0, gx, 0, rows);
    for (var gy = 0; gy <= rows; gy++) pts.push(0, 0, gy, cols, 0, gy);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    gridLines = new THREE.LineSegments(geo, gridMat);
    world.add(gridLines);

    world.position.set(-cols / 2, 0, -rows / 2);

    span = Math.max(cols, rows);
    camBase = { x: 0, y: span * 0.62, z: span * 0.72 };
    camera.fov = 55;
    camera.updateProjectionMatrix();

    var camDist = Math.sqrt(camBase.y * camBase.y + camBase.z * camBase.z);
    scene.fog = new THREE.Fog(0x000000, camDist * 0.85, camDist * 2.2);
    updateColors();
  }

  function updateColors() {
    var bgHex = cssVar('--bg') || '#0c1220';
    if (scene.fog) scene.fog.color.set(bgHex);
    gridMat.color.set(cssVar('--line-strong') || '#33447a');
    foodMat.color.set(cssVar('--gold-bright') || '#f2c14e');
    colorHead.set(cssVar('--gold') || '#f2c14e');
    colorTail.set(cssVar('--blue') || '#6f9ceb');
  }

  function updateSnakeMesh() {
    if (!snake) return;
    var n = Math.min(snake.length, maxInstances);
    for (var i = 0; i < n; i++) {
      var s = snake[i];
      var m = segmentMeshes[i];
      m.visible = true;
      m.position.set(s.x + 0.5, 0.3, s.y + 0.5);
      var scale = i === 0 ? 1 : 0.86;
      m.scale.setScalar(scale);
      var t = n > 1 ? i / (n - 1) : 0;
      m.material.color.copy(colorHead).lerp(colorTail, t);
    }
    for (var j = n; j < maxInstances; j++) segmentMeshes[j].visible = false;

    if (food) foodMesh.position.set(food.x + 0.5, 0.3, food.y + 0.5);
  }

  function resize() {
    var w = hero.clientWidth || window.innerWidth || 800;
    var h = hero.clientHeight || window.innerHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    var aspect = w / h;
    if (aspect >= 1) {
      rows = 8;
      cols = Math.min(24, Math.max(14, Math.round(rows * aspect)));
    } else {
      cols = 8;
      rows = Math.min(24, Math.max(14, Math.round(cols / aspect)));
    }
    if (!snake) {
      initGrid();
    }
    buildGrid();
    updateSnakeMesh();
  }

  var pointer = { x: 0, y: 0 };
  var pointerTarget = { x: 0, y: 0 };
  window.addEventListener('mousemove', function (e) {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  var ready = false;
  var last = null;
  function frame(ts) {
    if (last === null) last = ts;
    var dt = ts - last;
    last = ts;
    var elapsed = ts / 1000;

    acc += dt;
    while (acc >= stepMs) {
      step();
      acc -= stepMs;
    }
    updateSnakeMesh();

    pointer.x += (pointerTarget.x - pointer.x) * 0.04;
    pointer.y += (pointerTarget.y - pointer.y) * 0.04;

    camera.position.set(
      camBase.x + Math.sin(elapsed * 0.15) * span * 0.06 + pointer.x * span * 0.05,
      camBase.y + Math.cos(elapsed * 0.1) * span * 0.03,
      camBase.z
    );
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      canvas.classList.add('is-ready');
      if (fallback) fallback.style.display = 'none';
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  new MutationObserver(updateColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  initGrid();
  resize();
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroSnake);
} else {
  initHeroSnake();
}
