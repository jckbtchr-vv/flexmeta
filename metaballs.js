// Configuration
const config = {
  radius: 35,
  threshold: 0.8,
  spacing: 50,
  letterSpacing: 160,
  letterWidth: 1.0,
  letterHeight: 1.0,
  fillColor: '#000000',
  bgColor: '#ffffff',
  blur: 12,
  contrast: 20,
  animate: false,
  animSpeed: 1,
  animAmount: 10,
  // Per-letter settings
  letters: {
    F: { offsetX: 0, offsetY: 0, scale: 1.0, rotation: 0 },
    L: { offsetX: 0, offsetY: 0, scale: 1.0, rotation: 0 },
    E: { offsetX: 0, offsetY: 0, scale: 1.0, rotation: 0 },
    X: { offsetX: 0, offsetY: 0, scale: 1.0, rotation: 0 }
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
function getLetterBalls(letter, spacing, width = 1, height = 1) {
  const sw = spacing * width;  // horizontal spacing
  const sh = spacing * height; // vertical spacing

  switch(letter) {
    case 'F':
      return [
        // Vertical stem
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        // Top horizontal
        { x: sw, y: 0 },
        { x: sw * 2, y: 0 },
        // Middle horizontal
        { x: sw, y: sh },
      ];

    case 'L':
      return [
        // Vertical stem
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        // Bottom horizontal
        { x: sw, y: sh * 2 },
        { x: sw * 2, y: sh * 2 },
      ];

    case 'E':
      return [
        // Vertical stem
        { x: 0, y: 0 },
        { x: 0, y: sh },
        { x: 0, y: sh * 2 },
        // Top horizontal
        { x: sw, y: 0 },
        { x: sw * 2, y: 0 },
        // Middle horizontal
        { x: sw, y: sh },
        // Bottom horizontal
        { x: sw, y: sh * 2 },
        { x: sw * 2, y: sh * 2 },
      ];

    case 'X':
      // Four corner balls that merge - like the reference image
      return [
        { x: 0, y: 0 },             // top-left
        { x: sw * 2, y: 0 },        // top-right
        { x: sw, y: sh },           // center
        { x: 0, y: sh * 2 },        // bottom-left
        { x: sw * 2, y: sh * 2 },   // bottom-right
      ];

    default:
      return [];
  }
}

// Calculate all ball positions for the word
function calculateBalls() {
  const word = 'FLEX';
  const balls = [];
  const spacing = config.spacing;
  const w = config.letterWidth;
  const h = config.letterHeight;
  const letterWidth = spacing * w * 2.5;

  // Calculate total width
  const totalWidth = word.length * letterWidth + (word.length - 1) * (config.letterSpacing - letterWidth);
  const startX = (canvas.width - totalWidth) / 2;
  const startY = (canvas.height - spacing * h * 2) / 2;

  let currentX = startX;

  for (const letter of word) {
    const letterConfig = config.letters[letter];
    const scale = letterConfig.scale;
    const rotation = letterConfig.rotation * Math.PI / 180;
    const letterBalls = getLetterBalls(letter, spacing * scale, w, h);

    // Calculate letter center for rotation
    const centerX = spacing * w * scale;
    const centerY = spacing * h * scale;

    for (const ball of letterBalls) {
      // Apply rotation around letter center
      let rx = ball.x - centerX;
      let ry = ball.y - centerY;

      if (rotation !== 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const newRx = rx * cos - ry * sin;
        const newRy = rx * sin + ry * cos;
        rx = newRx;
        ry = newRy;
      }

      const finalX = currentX + rx + centerX + letterConfig.offsetX;
      const finalY = startY + ry + centerY + letterConfig.offsetY;

      balls.push({
        x: finalX,
        y: finalY,
        baseX: finalX,
        baseY: finalY,
        letter: letter
      });
    }

    currentX += config.letterSpacing;
  }

  return balls;
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
  const balls = calculateBalls();

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
    offCtx.arc(ball.x, ball.y, config.radius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Apply blur
  offCtx.filter = `blur(${config.blur}px)`;
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
    balls = calculateBalls();
    for (let i = 0; i < balls.length; i++) {
      const offset = i * 0.5;
      balls[i].x = balls[i].baseX + Math.sin(animationTime + offset) * config.animAmount;
      balls[i].y = balls[i].baseY + Math.cos(animationTime * 0.7 + offset) * config.animAmount * 0.5;
    }

    renderAnimated(balls);
    animationFrame = requestAnimationFrame(animate);
  }
}

function renderAnimated(balls) {
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
    offCtx.arc(ball.x, ball.y, config.radius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Apply blur
  offCtx.filter = `blur(${config.blur}px)`;
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
    'radius', 'threshold', 'spacing', 'letterSpacing',
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

  // Per-letter controls
  const letterControls = ['offsetX', 'offsetY', 'scale', 'rotation'];
  letterControls.forEach(prop => {
    const input = document.getElementById(`letter-${prop}`);
    const valueDisplay = document.getElementById(`letter-${prop}-value`);

    if (input) {
      input.addEventListener('input', () => {
        config.letters[selectedLetter][prop] = parseFloat(input.value);
        if (valueDisplay) {
          valueDisplay.textContent = prop === 'rotation' ? `${input.value}°` : input.value;
        }
        render();
      });
    }
  });
}

function updateLetterControls() {
  const letterConfig = config.letters[selectedLetter];

  document.getElementById('letter-offsetX').value = letterConfig.offsetX;
  document.getElementById('letter-offsetX-value').textContent = letterConfig.offsetX;

  document.getElementById('letter-offsetY').value = letterConfig.offsetY;
  document.getElementById('letter-offsetY-value').textContent = letterConfig.offsetY;

  document.getElementById('letter-scale').value = letterConfig.scale;
  document.getElementById('letter-scale-value').textContent = letterConfig.scale;

  document.getElementById('letter-rotation').value = letterConfig.rotation;
  document.getElementById('letter-rotation-value').textContent = `${letterConfig.rotation}°`;
}

// Presets
function applyPreset(name) {
  const presets = {
    default: {
      radius: 35,
      threshold: 0.8,
      spacing: 50,
      letterSpacing: 160,
      letterWidth: 1.0,
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
  const controls = ['radius', 'threshold', 'spacing', 'letterSpacing', 'letterWidth', 'letterHeight', 'blur', 'contrast', 'animSpeed', 'animAmount'];

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
  config.letterWidth = 1.0;
  config.letterHeight = 1.0;
  config.animate = false;
  config.animSpeed = 1;
  config.animAmount = 10;

  // Reset per-letter settings
  ['F', 'L', 'E', 'X'].forEach(letter => {
    config.letters[letter] = { offsetX: 0, offsetY: 0, scale: 1.0, rotation: 0 };
  });

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
render();

// Make functions globally available
window.applyPreset = applyPreset;
window.resetToDefaults = resetToDefaults;
window.exportPNG = exportPNG;
