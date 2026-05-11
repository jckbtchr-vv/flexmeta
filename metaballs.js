// Configuration
const config = {
  radius: 37,
  threshold: 0.85,
  spacing: 44,
  letterSpacing: 424,
  scale: 0.5,
  letterWidth: 1.0,
  letterHeight: 1.0,
  fillColor: '#000000',
  bgColor: '#ffffff',
  blur: 12,
  contrast: 20,
  animate: false,
  animSpeed: 1,
  animAmount: 10,
  // Per-letter structural settings (0-1 normalized)
  letters: {
    F: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    L: { footLength: 1.0 },
    E: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    X: { centerX: 0.5, centerY: 0.5, spread: 1.0 }
  }
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  canvas.width = Math.min(1200, container.clientWidth - 40);
  canvas.height = Math.min(600, container.clientHeight - 40);
}

// Letter definitions - each letter is an array of ball positions relative to letter origin
// Positions are normalized (will be multiplied by spacing)
function getLetterBalls(letter, spacing, width = 1, height = 1, letterConfig = {}) {
  const sw = spacing * width;  // horizontal spacing
  const sh = spacing * height; // vertical spacing

  switch(letter) {
    case 'F': {
      const crossbar = letterConfig.crossbar ?? 0.5;
      const armLength = letterConfig.armLength ?? 1.0;
      const crossbarLength = letterConfig.crossbarLength ?? 0.8;
      return [
        // Vertical stem (5 balls)
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        { x: 0, y: sh * 3 },
        { x: 0, y: sh * 4 },
        // Top horizontal (4 balls)
        { x: sw * armLength, y: 0 },
        { x: sw * 2 * armLength, y: 0 },
        { x: sw * 3 * armLength, y: 0 },
        { x: sw * 4 * armLength, y: 0 },
        // Middle horizontal (crossbar position: 0=top, 1=bottom)
        { x: sw * crossbarLength, y: sh * 4 * crossbar },
        { x: sw * 2 * crossbarLength, y: sh * 4 * crossbar },
        { x: sw * 3 * crossbarLength, y: sh * 4 * crossbar },
      ];
    }

    case 'L': {
      const footLength = letterConfig.footLength ?? 1.0;
      return [
        // Vertical stem (5 balls)
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        { x: 0, y: sh * 3 },
        { x: 0, y: sh * 4 },
        // Bottom horizontal (4 balls)
        { x: sw * footLength, y: sh * 4 },
        { x: sw * 2 * footLength, y: sh * 4 },
        { x: sw * 3 * footLength, y: sh * 4 },
        { x: sw * 4 * footLength, y: sh * 4 },
      ];
    }

    case 'E': {
      const crossbar = letterConfig.crossbar ?? 0.5;
      const armLength = letterConfig.armLength ?? 1.0;
      const crossbarLength = letterConfig.crossbarLength ?? 0.8;
      return [
        // Vertical stem (5 balls)
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        { x: 0, y: sh * 3 },
        { x: 0, y: sh * 4 },
        // Top horizontal (4 balls)
        { x: sw * armLength, y: 0 },
        { x: sw * 2 * armLength, y: 0 },
        { x: sw * 3 * armLength, y: 0 },
        { x: sw * 4 * armLength, y: 0 },
        // Middle horizontal (3 balls)
        { x: sw * crossbarLength, y: sh * 4 * crossbar },
        { x: sw * 2 * crossbarLength, y: sh * 4 * crossbar },
        { x: sw * 3 * crossbarLength, y: sh * 4 * crossbar },
        // Bottom horizontal (4 balls)
        { x: sw * armLength, y: sh * 4 },
        { x: sw * 2 * armLength, y: sh * 4 },
        { x: sw * 3 * armLength, y: sh * 4 },
        { x: sw * 4 * armLength, y: sh * 4 },
      ];
    }

    case 'X': {
      const centerX = letterConfig.centerX ?? 0.5;
      const centerY = letterConfig.centerY ?? 0.5;
      const spread = letterConfig.spread ?? 1.0;
      const cx = sw * 2;
      const cy = sh * 2;
      // 5 dots per diagonal (9 total, sharing center)
      return [
        // Top-left to bottom-right diagonal (5 dots)
        { x: cx - sw * 2 * spread, y: cy - sh * 2 * spread },
        { x: cx - sw * 1 * spread, y: cy - sh * 1 * spread },
        { x: cx + (centerX - 0.5) * sw, y: cy + (centerY - 0.5) * sh },  // center
        { x: cx + sw * 1 * spread, y: cy + sh * 1 * spread },
        { x: cx + sw * 2 * spread, y: cy + sh * 2 * spread },
        // Top-right to bottom-left diagonal (4 dots, center shared)
        { x: cx + sw * 2 * spread, y: cy - sh * 2 * spread },
        { x: cx + sw * 1 * spread, y: cy - sh * 1 * spread },
        { x: cx - sw * 1 * spread, y: cy + sh * 1 * spread },
        { x: cx - sw * 2 * spread, y: cy + sh * 2 * spread },
      ];
    }

    default:
      return [];
  }
}

// Calculate all ball positions for the word
function calculateBalls() {
  const word = 'FLEX';
  const balls = [];

  // Auto-scale based on canvas size (use 1200 as reference width)
  const canvasScale = Math.min(canvas.width / 1200, canvas.height / 600);
  const scale = config.scale * canvasScale;

  const spacing = config.spacing * scale;
  const w = config.letterWidth;
  const h = config.letterHeight;
  const letterWidth = spacing * w * 4.5;
  const scaledLetterSpacing = config.letterSpacing * scale;

  // Calculate total width
  const totalWidth = word.length * letterWidth + (word.length - 1) * (scaledLetterSpacing - letterWidth);
  const startX = (canvas.width - totalWidth) / 2;
  const startY = (canvas.height - spacing * h * 4) / 2;

  let currentX = startX;

  for (const letter of word) {
    const letterConfig = config.letters[letter];
    const letterBalls = getLetterBalls(letter, spacing, w, h, letterConfig);

    for (const ball of letterBalls) {
      const finalX = currentX + ball.x;
      const finalY = startY + ball.y;

      balls.push({
        x: finalX,
        y: finalY,
        baseX: finalX,
        baseY: finalY,
        letter: letter,
        scale: canvasScale
      });
    }

    currentX += scaledLetterSpacing;
  }

  return { balls, canvasScale };
}

// Metaball field function
function metaballField(x, y, balls, radius) {
  let sum = 0;
  for (const ball of balls) {
    const dx = x - ball.x;
    const dy = y - ball.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0) {
      sum += (radius * radius) / distSq;
    }
  }
  return sum;
}

// Render using CSS filter technique for smooth metaballs
function renderWithFilter() {
  const { balls, canvasScale } = calculateBalls();
  const scaledRadius = config.radius * canvasScale;
  const scaledBlur = config.blur * canvasScale;

  // Clear with background
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create offscreen canvas for blur effect
  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const offCtx = offscreen.getContext('2d');

  // Fill offscreen with background
  offCtx.fillStyle = config.bgColor;
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  // Draw balls
  offCtx.fillStyle = config.fillColor;
  for (const ball of balls) {
    offCtx.beginPath();
    offCtx.arc(ball.x, ball.y, scaledRadius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Apply blur
  offCtx.filter = `blur(${scaledBlur}px)`;
  offCtx.drawImage(offscreen, 0, 0);
  offCtx.filter = 'none';

  // Apply contrast to create metaball effect
  ctx.filter = `contrast(${config.contrast})`;
  ctx.drawImage(offscreen, 0, 0);
  ctx.filter = 'none';
}

// Alternative: Pixel-based metaball rendering
function renderPixelBased() {
  const balls = calculateBalls();
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;

  // Parse colors
  const fill = hexToRgb(config.fillColor);
  const bg = hexToRgb(config.bgColor);

  const threshold = config.threshold;
  const radius = config.radius;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const field = metaballField(x, y, balls, radius);
      const idx = (y * canvas.width + x) * 4;

      if (field >= threshold) {
        // Inside metaball
        data[idx] = fill.r;
        data[idx + 1] = fill.g;
        data[idx + 2] = fill.b;
        data[idx + 3] = 255;
      } else {
        // Background
        data[idx] = bg.r;
        data[idx + 1] = bg.g;
        data[idx + 2] = bg.b;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Smooth pixel-based rendering with antialiasing
function renderSmoothPixel() {
  const balls = calculateBalls();
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;

  const fill = hexToRgb(config.fillColor);
  const bg = hexToRgb(config.bgColor);

  const threshold = config.threshold;
  const radius = config.radius;
  const edgeWidth = 0.1; // For smooth edges

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const field = metaballField(x, y, balls, radius);
      const idx = (y * canvas.width + x) * 4;

      // Smooth interpolation at edges
      const t = smoothstep(threshold - edgeWidth, threshold + edgeWidth, field);

      data[idx] = lerp(bg.r, fill.r, t);
      data[idx + 1] = lerp(bg.g, fill.g, t);
      data[idx + 2] = lerp(bg.b, fill.b, t);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Helper functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Animation
let animationTime = 0;
let animationFrame = null;
let balls = [];

function animate() {
  if (config.animate) {
    animationTime += 0.016 * config.animSpeed;

    // Update ball positions with animation
    const { balls: calculatedBalls, canvasScale } = calculateBalls();
    balls = calculatedBalls;
    const scaledAnimAmount = config.animAmount * canvasScale;

    for (let i = 0; i < balls.length; i++) {
      const offset = i * 0.5;
      balls[i].x = balls[i].baseX + Math.sin(animationTime + offset) * scaledAnimAmount;
      balls[i].y = balls[i].baseY + Math.cos(animationTime * 0.7 + offset) * scaledAnimAmount * 0.5;
    }

    renderAnimated(balls, canvasScale);
    animationFrame = requestAnimationFrame(animate);
  }
}

function renderAnimated(balls, canvasScale) {
  const scaledRadius = config.radius * canvasScale;
  const scaledBlur = config.blur * canvasScale;

  // Clear with background
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create offscreen canvas
  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const offCtx = offscreen.getContext('2d');

  offCtx.fillStyle = config.bgColor;
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  // Draw balls
  offCtx.fillStyle = config.fillColor;
  for (const ball of balls) {
    offCtx.beginPath();
    offCtx.arc(ball.x, ball.y, scaledRadius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Apply blur
  offCtx.filter = `blur(${scaledBlur}px)`;
  offCtx.drawImage(offscreen, 0, 0);
  offCtx.filter = 'none';

  // Apply contrast
  ctx.filter = `contrast(${config.contrast})`;
  ctx.drawImage(offscreen, 0, 0);
  ctx.filter = 'none';
}

function render() {
  if (config.animate) return; // Animation handles its own rendering
  renderWithFilter();
}

// UI Controls
let selectedLetter = 'F';

function setupControls() {
  const controls = [
    'radius', 'threshold', 'spacing', 'letterSpacing', 'scale',
    'letterWidth', 'letterHeight',
    'blur', 'contrast', 'animSpeed', 'animAmount'
  ];

  controls.forEach(id => {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);

    if (input) {
      input.addEventListener('input', () => {
        config[id] = parseFloat(input.value);
        if (valueDisplay) valueDisplay.textContent = input.value;
        render();
      });
    }
  });

  // Color inputs
  document.getElementById('fillColor').addEventListener('input', (e) => {
    config.fillColor = e.target.value;
    render();
  });

  document.getElementById('bgColor').addEventListener('input', (e) => {
    config.bgColor = e.target.value;
    document.body.style.background = e.target.value;
    document.querySelector('.canvas-container').style.background = e.target.value;
    render();
  });

  // Animation toggle
  document.getElementById('animate').addEventListener('change', (e) => {
    config.animate = e.target.checked;
    if (config.animate) {
      animate();
    } else {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      render();
    }
  });

  // Letter tabs
  document.querySelectorAll('.letter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.letter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedLetter = tab.dataset.letter;
      updateLetterControls();
    });
  });

  // Per-letter structural controls
  setupLetterInputs('F', ['crossbar', 'armLength', 'crossbarLength']);
  setupLetterInputs('L', ['footLength']);
  setupLetterInputs('E', ['crossbar', 'armLength', 'crossbarLength']);
  setupLetterInputs('X', ['centerX', 'centerY', 'spread']);
}

function setupLetterInputs(letter, props) {
  props.forEach(prop => {
    const input = document.getElementById(`${letter}-${prop}`);
    const valueDisplay = document.getElementById(`${letter}-${prop}-value`);

    if (input) {
      input.addEventListener('input', () => {
        config.letters[letter][prop] = parseFloat(input.value);
        if (valueDisplay) {
          valueDisplay.textContent = input.value;
        }
        render();
      });
    }
  });
}

function updateLetterControls() {
  // Hide all letter control panels
  document.querySelectorAll('.letter-form-controls').forEach(el => {
    el.style.display = 'none';
  });

  // Show the selected letter's controls
  const panel = document.getElementById(`controls-${selectedLetter}`);
  if (panel) {
    panel.style.display = 'block';
  }

  // Update input values
  const letterConfig = config.letters[selectedLetter];
  for (const [prop, value] of Object.entries(letterConfig)) {
    const input = document.getElementById(`${selectedLetter}-${prop}`);
    const valueDisplay = document.getElementById(`${selectedLetter}-${prop}-value`);
    if (input) {
      input.value = value;
      if (valueDisplay) valueDisplay.textContent = value;
    }
  }
}

// Presets
function applyPreset(name) {
  const presets = {
    default: {
      radius: 37,
      threshold: 0.85,
      spacing: 44,
      letterSpacing: 424,
      scale: 0.5,
      letterWidth: 0.95,
      letterHeight: 1.0,
      blur: 12,
      contrast: 20
    },
    tight: {
      radius: 28,
      threshold: 1.0,
      spacing: 35,
      letterSpacing: 120,
      letterWidth: 0.8,
      letterHeight: 1.0,
      blur: 8,
      contrast: 25
    },
    loose: {
      radius: 45,
      threshold: 0.6,
      spacing: 65,
      letterSpacing: 200,
      letterWidth: 1.2,
      letterHeight: 1.0,
      blur: 15,
      contrast: 18
    },
    gooey: {
      radius: 40,
      threshold: 0.5,
      spacing: 55,
      letterSpacing: 170,
      letterWidth: 1.0,
      letterHeight: 1.0,
      blur: 20,
      contrast: 30
    }
  };

  const preset = presets[name];
  if (preset) {
    Object.assign(config, preset);
    updateUIFromConfig();
    render();
  }
}

function updateUIFromConfig() {
  const controls = ['radius', 'threshold', 'spacing', 'letterSpacing', 'scale', 'letterWidth', 'letterHeight', 'blur', 'contrast', 'animSpeed', 'animAmount'];

  controls.forEach(id => {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);
    if (input) {
      input.value = config[id];
      if (valueDisplay) valueDisplay.textContent = config[id];
    }
  });

  document.getElementById('fillColor').value = config.fillColor;
  document.getElementById('bgColor').value = config.bgColor;
  document.getElementById('animate').checked = config.animate;

  updateLetterControls();
}

function resetToDefaults() {
  applyPreset('default');
  config.fillColor = '#000000';
  config.bgColor = '#ffffff';
  config.scale = 1.0;
  config.letterWidth = 1.0;
  config.letterHeight = 1.0;
  config.animate = false;
  config.animSpeed = 1;
  config.animAmount = 10;

  // Reset per-letter settings
  config.letters = {
    F: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    L: { footLength: 1.0 },
    E: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    X: { centerX: 0.5, centerY: 0.5, spread: 1.0 }
  };

  if (animationFrame) cancelAnimationFrame(animationFrame);

  updateUIFromConfig();
  document.body.style.background = '#fff';
  document.querySelector('.canvas-container').style.background = '#fff';
  render();
}

function exportPNG() {
  const link = document.createElement('a');
  link.download = 'flex-metaballs.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Initialize
window.addEventListener('resize', () => {
  resizeCanvas();
  render();
});

resizeCanvas();
setupControls();
updateUIFromConfig();
render();

function resetLetter() {
  const defaults = {
    F: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    L: { footLength: 1.0 },
    E: { crossbar: 0.5, armLength: 1.0, crossbarLength: 0.8 },
    X: { centerX: 0.5, centerY: 0.5, spread: 1.0 }
  };
  config.letters[selectedLetter] = { ...defaults[selectedLetter] };
  updateLetterControls();
  render();
}

// Make functions globally available
window.applyPreset = applyPreset;
window.resetToDefaults = resetToDefaults;
window.resetLetter = resetLetter;
window.exportPNG = exportPNG;
