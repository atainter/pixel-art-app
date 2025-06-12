/**
 * 64x64 LED Matrix Animation System
 *
 * Usage for LED Matrix:
 * 1. Call getAnimationMatrix(animationName, frameNumber) to get RGB matrix
 * 2. Matrix format: matrix[y][x] = {r: 0-255, g: 0-255, b: 0-255}
 * 3. Available animations: "pacman", "spaceinvaders", "zelda", "mario",
 *    "neongrid", "sunset", "synthcar", "mountains", "cityscape", "digitalrain"
 *
 * Example:
 * const matrix = getAnimationMatrix("pacman", 30);
 * const pixel = matrix[0][0]; // {r: 255, g: 255, b: 0}
 */

class PixelAnimationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.currentAnimation = null;
    this.animationFrame = 0;
    this.lastFrameTime = 0;
    this.FPS = 15;
    this.FRAME_DURATION = 1000 / this.FPS;
    this.hueShift = 0;
    this.currentAnimationType = "";

    // Disable smoothing for crisp pixels
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
  }

  // Extract 64x64 RGB matrix from current canvas
  getPixelMatrix() {
    const imageData = this.ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    const matrix = [];

    for (let y = 0; y < 64; y++) {
      const row = [];
      for (let x = 0; x < 64; x++) {
        const index = (y * 64 + x) * 4;
        row.push({
          r: data[index], // Red
          g: data[index + 1], // Green
          b: data[index + 2], // Blue
        });
      }
      matrix.push(row);
    }
    return matrix;
  }

  // Get matrix for specific animation and frame
  getAnimationMatrix(animationName, frameNumber) {
    const savedAnimation = this.currentAnimation;
    const savedFrame = this.animationFrame;
    const savedType = this.currentAnimationType;

    // Create temporary animation instance
    this.startAnimation(animationName);

    // Run animation for specified number of frames
    for (let i = 0; i < frameNumber; i++) {
      if (this.currentAnimation) {
        this.currentAnimation.update();
      }
    }

    // Draw the frame
    if (this.currentAnimation) {
      this.currentAnimation.draw();
    }

    // Extract matrix
    const matrix = this.getPixelMatrix();

    // Restore previous animation state
    this.currentAnimation = savedAnimation;
    this.animationFrame = savedFrame;
    this.currentAnimationType = savedType;

    return matrix;
  }

  setHueShift(hue) {
    this.hueShift = hue;
    if (this.currentAnimation) {
      this.currentAnimation.hueShift = hue;
    }
  }

  // Helper function to shift hue of hex colors
  shiftHue(color, hueShift) {
    if (hueShift === 0) return color;

    // Convert hex to RGB
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    // Shift hue and convert back
    h = (h * 360 + hueShift) % 360;
    if (h < 0) h += 360;

    return `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
  }

  startAnimation(type) {
    this.currentAnimationType = type;
    switch (type) {
      case "pacman":
        this.currentAnimation = new PacmanAnimation(this.ctx);
        break;
      case "spaceinvaders":
        this.currentAnimation = new SpaceInvadersAnimation(this.ctx);
        break;
      case "zelda":
        this.currentAnimation = new ZeldaHeartAnimation(this.ctx);
        break;
      case "mario":
        this.currentAnimation = new MarioFireballAnimation(this.ctx);
        break;
      case "neongrid":
        this.currentAnimation = new NeonGridAnimation(this.ctx);
        break;
      case "sunset":
        this.currentAnimation = new RetroSunsetAnimation(this.ctx);
        break;
      case "synthcar":
        this.currentAnimation = new SynthCarAnimation(this.ctx);
        break;
      case "mountains":
        this.currentAnimation = new GeometricMountainsAnimation(this.ctx);
        break;
      case "cityscape":
        this.currentAnimation = new NeonCityscapeAnimation(this.ctx);
        break;
      case "digitalrain":
        this.currentAnimation = new DigitalRainAnimation(this.ctx);
        break;
    }
    if (this.currentAnimation) {
      this.currentAnimation.hueShift = this.hueShift;
      this.currentAnimation.engine = this;
    }
    this.animationFrame = 0;
  }

  gameLoop = (timestamp) => {
    if (timestamp - this.lastFrameTime >= this.FRAME_DURATION) {
      if (this.currentAnimation) {
        this.currentAnimation.update();
        this.currentAnimation.draw();

        // Update matrix visualization if callback is set
        if (this.onMatrixUpdate) {
          const matrix = this.getPixelMatrix();
          this.onMatrixUpdate(
            matrix,
            this.currentAnimationType,
            this.animationFrame
          );
        }
      }
      this.lastFrameTime = timestamp;
      this.animationFrame++;
    }
    requestAnimationFrame(this.gameLoop);
  };

  // Set callback for real-time matrix updates
  setMatrixUpdateCallback(callback) {
    this.onMatrixUpdate = callback;
  }
}

class PacmanAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.x = -16;
    this.y = 28;
    this.mouthOpen = true;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;

    // Simple dots across the screen
    this.dots = [];
    for (let i = 8; i < 64; i += 8) {
      this.dots.push({ x: i, y: 32, eaten: false });
    }
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
    this.x += 1.5;

    // Toggle mouth every 5 frames
    if (this.frameCount % 5 === 0) {
      this.mouthOpen = !this.mouthOpen;
    }

    // Eat dots
    this.dots.forEach((dot) => {
      if (!dot.eaten && Math.abs(this.x + 8 - dot.x) < 6) {
        dot.eaten = true;
      }
    });

    // Reset when off screen
    if (this.x > 80) {
      this.x = -16;
      this.dots.forEach((dot) => (dot.eaten = false));
    }
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw dots
    this.ctx.fillStyle = this.getColor("#FFFF00");
    this.dots.forEach((dot) => {
      if (!dot.eaten) {
        this.ctx.fillRect(dot.x, dot.y, 2, 2);
      }
    });

    // Draw Pacman if on screen
    if (this.x > -16 && this.x < 64) {
      this.drawPacman();
    }
  }

  drawPacman() {
    this.ctx.fillStyle = this.getColor("#FFFF00");

    // Simple circle body (12x12 pixels)
    const body = [
      [this.x + 2, this.y, 8, 2],
      [this.x, this.y + 2, 12, 2],
      [this.x, this.y + 4, 12, 2],
      [this.x, this.y + 6, 12, 2],
      [this.x, this.y + 8, 12, 2],
      [this.x + 2, this.y + 10, 8, 2],
    ];

    body.forEach(([x, y, w, h]) => {
      this.ctx.fillRect(x, y, w, h);
    });

    // Draw mouth opening if mouth is open
    if (this.mouthOpen) {
      this.ctx.fillStyle = "#000";
      // Simple triangular mouth
      this.ctx.fillRect(this.x + 8, this.y + 4, 4, 2);
      this.ctx.fillRect(this.x + 10, this.y + 6, 2, 2);
    }

    // Simple eye
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(this.x + 4, this.y + 3, 2, 2);
  }
}

class SpaceInvadersAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.invaders = [];
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;

    // Create 3x5 grid of invaders
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        this.invaders.push({
          x: col * 12 + 4,
          y: row * 10 + 8,
          alive: true,
          type: row,
        });
      }
    }

    this.player = { x: 28, y: 54 };
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;

    // Move invaders down slowly
    if (this.frameCount % 30 === 0) {
      this.invaders.forEach((invader) => {
        if (invader.alive) {
          invader.y += 2;
          // Reset when they get too low
          if (invader.y > 50) {
            invader.y = 8;
          }
        }
      });
    }

    // Move player left and right
    if (this.frameCount % 45 === 0) {
      this.player.x = ((this.player.x + 8) % 48) + 8;
    }
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw invaders
    this.invaders.forEach((invader) => {
      if (invader.alive) {
        // Different colors per row
        const colors = ["#00FF00", "#FFFF00", "#FF00FF"];
        this.ctx.fillStyle = this.getColor(colors[invader.type]);
        this.drawInvader(invader.x, invader.y);
      }
    });

    // Draw player
    this.ctx.fillStyle = this.getColor("#00FF00");
    this.drawPlayer(this.player.x, this.player.y);
  }

  drawInvader(x, y) {
    // Simple 8x6 invader sprite
    const pattern = [
      [x + 2, y, 4, 2], // Top
      [x, y + 2, 8, 2], // Middle
      [x + 1, y + 4, 2, 2], // Left leg
      [x + 5, y + 4, 2, 2], // Right leg
    ];

    pattern.forEach(([px, py, w, h]) => {
      this.ctx.fillRect(px, py, w, h);
    });
  }

  drawPlayer(x, y) {
    // Simple player ship
    const pattern = [
      [x + 3, y, 2, 2], // Top
      [x + 1, y + 2, 6, 2], // Middle
      [x, y + 4, 8, 2], // Base
    ];

    pattern.forEach(([px, py, w, h]) => {
      this.ctx.fillRect(px, py, w, h);
    });
  }
}

class ZeldaHeartAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.scale = 1;
    this.scaleDirection = 1;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;

    // Simple pulsing effect
    this.scale += this.scaleDirection * 0.03;
    if (this.scale > 1.3) {
      this.scaleDirection = -1;
    } else if (this.scale < 0.7) {
      this.scaleDirection = 1;
    }
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw heart in center
    this.ctx.save();
    this.ctx.translate(32, 32);
    this.ctx.scale(this.scale, this.scale);

    // Golden heart container
    this.ctx.fillStyle = this.getColor("#FFD700");
    this.drawHeart(-10, -10);

    // Red inner heart
    this.ctx.fillStyle = this.getColor("#FF0000");
    this.drawHeart(-7, -7);

    this.ctx.restore();
  }

  drawHeart(x, y) {
    // Simple heart shape (14x12 pixels)
    const pattern = [
      [x + 3, y, 3, 2],
      [x + 8, y, 3, 2], // Top bumps
      [x + 1, y + 2, 7, 2],
      [x + 8, y + 2, 4, 2], // Upper body
      [x, y + 4, 14, 2], // Wide middle
      [x + 1, y + 6, 12, 2], // Narrowing
      [x + 3, y + 8, 8, 2], // More narrow
      [x + 5, y + 10, 4, 2], // Point area
      [x + 6, y + 12, 2, 2], // Point
    ];

    pattern.forEach(([px, py, w, h]) => {
      this.ctx.fillRect(px, py, w, h);
    });
  }
}

class MarioFireballAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.x = -12;
    this.y = 44;
    this.bounceHeight = 0;
    this.bounceDirection = -1;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
    this.x += 1.5;

    // Simple bouncing
    this.bounceHeight += this.bounceDirection * 1.5;
    if (this.bounceHeight < -16) {
      this.bounceDirection = 1;
    } else if (this.bounceHeight > 0) {
      this.bounceDirection = -1;
      this.bounceHeight = 0;
    }

    // Reset when off screen
    if (this.x > 76) {
      this.x = -12;
      this.bounceHeight = 0;
    }
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw ground
    this.ctx.fillStyle = this.getColor("#8B4513");
    this.ctx.fillRect(0, 52, 64, 12);

    // Draw fireball if on screen
    if (this.x > -12 && this.x < 64) {
      this.drawFireball(this.x, this.y + this.bounceHeight);
    }
  }

  drawFireball(x, y) {
    // Orange fireball
    this.ctx.fillStyle = this.getColor("#FF4500");
    const pattern = [
      [x + 2, y, 6, 2], // Top
      [x, y + 2, 10, 2], // Upper
      [x, y + 4, 10, 2], // Middle
      [x + 2, y + 6, 6, 2], // Bottom
    ];

    pattern.forEach(([px, py, w, h]) => {
      this.ctx.fillRect(px, py, w, h);
    });

    // Yellow center
    this.ctx.fillStyle = this.getColor("#FFFF00");
    const center = [
      [x + 3, y + 2, 4, 2], // Center top
      [x + 3, y + 4, 4, 2], // Center bottom
    ];

    center.forEach(([px, py, w, h]) => {
      this.ctx.fillRect(px, py, w, h);
    });
  }
}

// New Retrowave Animations

class NeonGridAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
    this.gridOffset = 0;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
    this.gridOffset += 0.5;
    if (this.gridOffset >= 8) this.gridOffset = 0;
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw moving grid lines
    this.ctx.fillStyle = this.getColor("#00FFFF");

    // Vertical lines
    for (let x = -this.gridOffset; x < 64; x += 8) {
      this.ctx.fillRect(x, 0, 1, 64);
    }

    // Horizontal lines
    for (let y = -this.gridOffset; y < 64; y += 8) {
      this.ctx.fillRect(0, y, 64, 1);
    }

    // Draw pulsing center dot
    const pulse = Math.sin(this.frameCount * 0.3) * 0.5 + 0.5;
    const alpha = pulse * 0.8 + 0.2;
    this.ctx.fillStyle = this.getColor("#FF00FF")
      .replace(")", `, ${alpha})`)
      .replace("hsl", "hsla");
    this.ctx.fillRect(30, 30, 4, 4);
  }
}

class RetroSunsetAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
    this.sunY = 32;
    this.direction = -1;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;

    // Moving sun
    this.sunY += this.direction * 0.3;
    if (this.sunY < 16 || this.sunY > 48) {
      this.direction *= -1;
    }
  }

  draw() {
    // Gradient sky
    for (let y = 0; y < 40; y++) {
      const intensity = y / 40;
      this.ctx.fillStyle = `hsl(${300 + this.hueShift}, 70%, ${
        30 + intensity * 40
      }%)`;
      this.ctx.fillRect(0, y, 64, 1);
    }

    // Ground
    this.ctx.fillStyle = this.getColor("#8B0080");
    this.ctx.fillRect(0, 40, 64, 24);

    // Grid on ground
    this.ctx.fillStyle = this.getColor("#FF00FF");
    for (let x = 0; x < 64; x += 8) {
      this.ctx.fillRect(x, 40, 1, 24);
    }
    for (let y = 40; y < 64; y += 4) {
      this.ctx.fillRect(0, y, 64, 1);
    }

    // Sun
    this.ctx.fillStyle = this.getColor("#FFFF00");
    this.ctx.fillRect(28, this.sunY, 8, 8);

    // Sun rays
    this.ctx.fillStyle = this.getColor("#FF8000");
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.frameCount * 0.1;
      const x = 32 + Math.cos(angle) * 12;
      const y = this.sunY + 4 + Math.sin(angle) * 12;
      if (x >= 0 && x < 64 && y >= 0 && y < 64) {
        this.ctx.fillRect(x, y, 2, 2);
      }
    }
  }
}

class SynthCarAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
    this.carX = -20;
    this.roadOffset = 0;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
    this.carX += 1;
    this.roadOffset += 2;

    if (this.carX > 80) this.carX = -20;
    if (this.roadOffset >= 8) this.roadOffset = 0;
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Moving road grid
    this.ctx.fillStyle = this.getColor("#0080FF");
    for (let x = -this.roadOffset; x < 64; x += 8) {
      this.ctx.fillRect(x, 40, 1, 24);
    }
    for (let y = 40; y < 64; y += 4) {
      this.ctx.fillRect(0, y, 64, 1);
    }

    // Horizon line
    this.ctx.fillStyle = this.getColor("#FF00FF");
    this.ctx.fillRect(0, 39, 64, 2);

    // Car
    if (this.carX > -12 && this.carX < 64) {
      this.drawCar(this.carX, 44);
    }

    // Stars
    this.ctx.fillStyle = this.getColor("#FFFFFF");
    for (let i = 0; i < 20; i++) {
      const x = (i * 23) % 64;
      const y = (i * 17) % 30;
      const twinkle = Math.sin(this.frameCount * 0.2 + i) * 0.5 + 0.5;
      if (twinkle > 0.5) {
        this.ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  drawCar(x, y) {
    // Car body
    this.ctx.fillStyle = this.getColor("#FF0080");
    this.ctx.fillRect(x + 2, y, 8, 6);

    // Car top
    this.ctx.fillStyle = this.getColor("#8000FF");
    this.ctx.fillRect(x + 3, y - 2, 6, 3);

    // Wheels
    this.ctx.fillStyle = this.getColor("#FFFFFF");
    this.ctx.fillRect(x + 1, y + 5, 2, 2);
    this.ctx.fillRect(x + 9, y + 5, 2, 2);

    // Lights
    this.ctx.fillStyle = this.getColor("#FFFF00");
    this.ctx.fillRect(x + 10, y + 2, 2, 2);
  }
}

class GeometricMountainsAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
  }

  draw() {
    // Gradient sky
    for (let y = 0; y < 32; y++) {
      const intensity = y / 32;
      this.ctx.fillStyle = `hsl(${250 + this.hueShift}, 80%, ${
        20 + intensity * 30
      }%)`;
      this.ctx.fillRect(0, y, 64, 1);
    }

    // Back mountains (darkest)
    this.ctx.fillStyle = this.getColor("#4B0082");
    const backMountains = [
      [0, 32, 20, 32],
      [15, 24, 25, 40],
      [35, 28, 29, 36],
    ];
    backMountains.forEach(([x, y, w, h]) => {
      this.ctx.fillRect(x, y, w, h);
    });

    // Middle mountains
    this.ctx.fillStyle = this.getColor("#8A2BE2");
    const middleMountains = [
      [5, 36, 15, 28],
      [25, 30, 20, 34],
      [40, 34, 24, 30],
    ];
    middleMountains.forEach(([x, y, w, h]) => {
      this.ctx.fillRect(x, y, w, h);
    });

    // Front mountains (brightest)
    this.ctx.fillStyle = this.getColor("#FF00FF");
    const frontMountains = [
      [10, 40, 12, 24],
      [30, 38, 16, 26],
      [50, 42, 14, 22],
    ];
    frontMountains.forEach(([x, y, w, h]) => {
      this.ctx.fillRect(x, y, w, h);
    });

    // Geometric shapes floating
    const pulse = Math.sin(this.frameCount * 0.1) * 0.3 + 0.7;
    this.ctx.fillStyle = this.getColor("#00FFFF")
      .replace(")", `, ${pulse})`)
      .replace("hsl", "hsla");

    // Triangle
    this.ctx.fillRect(15, 15, 6, 2);
    this.ctx.fillRect(16, 13, 4, 2);
    this.ctx.fillRect(17, 11, 2, 2);

    // Square
    this.ctx.fillRect(45, 12, 6, 6);
  }
}

class NeonCityscapeAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
    this.buildings = [
      { x: 0, height: 20, color: "#FF0080" },
      { x: 8, height: 32, color: "#0080FF" },
      { x: 16, height: 16, color: "#00FF80" },
      { x: 24, height: 28, color: "#FF8000" },
      { x: 32, height: 24, color: "#8000FF" },
      { x: 40, height: 36, color: "#FF0040" },
      { x: 48, height: 12, color: "#40FF00" },
      { x: 56, height: 20, color: "#FF4080" },
    ];
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Buildings
    this.buildings.forEach((building, i) => {
      this.ctx.fillStyle = this.getColor(building.color);
      this.ctx.fillRect(building.x, 64 - building.height, 8, building.height);

      // Windows (blinking)
      this.ctx.fillStyle = this.getColor("#FFFFFF");
      for (let y = 64 - building.height + 4; y < 64; y += 6) {
        for (let x = building.x + 2; x < building.x + 6; x += 3) {
          const blink = Math.sin(this.frameCount * 0.2 + i + x + y) > 0;
          if (blink) {
            this.ctx.fillRect(x, y, 1, 2);
          }
        }
      }
    });

    // Flying car
    const carX = ((this.frameCount * 1.5) % 80) - 16;
    if (carX > -12 && carX < 64) {
      this.ctx.fillStyle = this.getColor("#FF00FF");
      this.ctx.fillRect(carX, 20, 8, 3);
      this.ctx.fillStyle = this.getColor("#FFFF00");
      this.ctx.fillRect(carX + 6, 21, 2, 1);
    }

    // Laser beams
    if (this.frameCount % 30 < 5) {
      this.ctx.fillStyle = this.getColor("#00FFFF");
      this.ctx.fillRect(32, 0, 1, 64);
    }
  }
}

class DigitalRainAnimation {
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCount = 0;
    this.hueShift = 0;
    this.engine = null;
    this.drops = [];

    // Initialize rain drops
    for (let i = 0; i < 15; i++) {
      this.drops.push({
        x: Math.floor(Math.random() * 64),
        y: Math.random() * -64,
        speed: Math.random() * 2 + 1,
        char: Math.floor(Math.random() * 2), // 0 or 1
      });
    }
  }

  getColor(baseColor) {
    return this.engine
      ? this.engine.shiftHue(baseColor, this.hueShift)
      : baseColor;
  }

  update() {
    this.frameCount++;

    // Update drops
    this.drops.forEach((drop) => {
      drop.y += drop.speed;
      if (drop.y > 64) {
        drop.y = Math.random() * -32;
        drop.x = Math.floor(Math.random() * 64);
        drop.char = Math.floor(Math.random() * 2);
      }

      // Occasionally change character
      if (Math.random() < 0.1) {
        drop.char = Math.floor(Math.random() * 2);
      }
    });
  }

  draw() {
    // Black background
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, 64, 64);

    // Draw digital rain
    this.drops.forEach((drop) => {
      if (drop.y >= 0 && drop.y < 64) {
        // Fade effect - brighter at the head
        const alpha = Math.max(0.3, 1 - (drop.y % 8) / 8);
        this.ctx.fillStyle = this.getColor("#00FF00")
          .replace(")", `, ${alpha})`)
          .replace("hsl", "hsla");

        // Draw binary character (simplified as pixels)
        if (drop.char === 0) {
          // Draw "0"
          this.ctx.fillRect(drop.x, drop.y, 3, 1);
          this.ctx.fillRect(drop.x, drop.y + 1, 1, 3);
          this.ctx.fillRect(drop.x + 2, drop.y + 1, 1, 3);
          this.ctx.fillRect(drop.x, drop.y + 4, 3, 1);
        } else {
          // Draw "1"
          this.ctx.fillRect(drop.x + 1, drop.y, 1, 5);
        }

        // Trail effect
        for (let i = 1; i < 5; i++) {
          const trailY = drop.y - i * 2;
          if (trailY >= 0) {
            const trailAlpha = alpha * (1 - i * 0.2);
            this.ctx.fillStyle = this.getColor("#00FF00")
              .replace(")", `, ${trailAlpha})`)
              .replace("hsl", "hsla");
            this.ctx.fillRect(drop.x + 1, trailY, 1, 1);
          }
        }
      }
    });

    // Random glitches
    if (Math.random() < 0.05) {
      const glitchX = Math.floor(Math.random() * 64);
      const glitchY = Math.floor(Math.random() * 64);
      this.ctx.fillStyle = this.getColor("#FFFF00");
      this.ctx.fillRect(glitchX, glitchY, 2, 2);
    }
  }
}

// Matrix visualization variables
let matrixGrid;
let matrixPixels = [];
let hexFormat = false;
let currentMatrix = null;

// Create 64x64 grid of pixel elements
function createMatrixGrid() {
  matrixGrid = document.getElementById("matrixGrid");
  matrixPixels = [];

  for (let y = 0; y < 64; y++) {
    matrixPixels[y] = [];
    for (let x = 0; x < 64; x++) {
      const pixel = document.createElement("div");
      pixel.className = "matrix-pixel";
      pixel.dataset.x = x;
      pixel.dataset.y = y;
      pixel.title = `Pixel (${x}, ${y})`;

      // Add click handler to highlight pixel
      pixel.addEventListener("click", () => {
        // Remove previous active
        document
          .querySelectorAll(".matrix-pixel.active")
          .forEach((p) => p.classList.remove("active"));
        pixel.classList.add("active");

        // Show detailed info in console
        if (currentMatrix) {
          const rgb = currentMatrix[y][x];
          console.log(`Pixel (${x}, ${y}):`, rgb);

          // Show alert with RGB values
          alert(
            `Pixel (${x}, ${y})\nRGB: ${rgb.r}, ${rgb.g}, ${
              rgb.b
            }\nHex: ${rgbToHex(rgb.r, rgb.g, rgb.b)}`
          );
        }
      });

      // Add hover handler for live RGB display
      pixel.addEventListener("mouseenter", () => {
        if (currentMatrix) {
          const rgb = currentMatrix[y][x];
          pixel.title = `(${x}, ${y}) RGB: ${rgb.r}, ${rgb.g}, ${
            rgb.b
          } | Hex: ${rgbToHex(rgb.r, rgb.g, rgb.b)}`;

          // Update live info display
          const pixelInfo = document.getElementById("pixelInfo");
          if (pixelInfo) {
            pixelInfo.innerHTML = `Pixel (${x}, ${y}): <span style="color: #00ffff;">RGB(${
              rgb.r
            }, ${rgb.g}, ${
              rgb.b
            })</span> | <span style="color: #ff00ff;">${rgbToHex(
              rgb.r,
              rgb.g,
              rgb.b
            )}</span>`;
          }
        }
      });

      pixel.addEventListener("mouseleave", () => {
        const pixelInfo = document.getElementById("pixelInfo");
        if (pixelInfo) {
          pixelInfo.textContent = "Hover over pixels for RGB values";
        }
      });

      matrixGrid.appendChild(pixel);
      matrixPixels[y][x] = pixel;
    }
  }
}

// Function to update matrix display with RGB values
function renderMatrix(matrix) {
  if (!matrixPixels.length) return;

  currentMatrix = matrix;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const pixel = matrix[y][x];
      const element = matrixPixels[y][x];

      if (hexFormat) {
        // Show as hex color
        const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
        element.textContent = hex;
        element.style.color = "#ffffff";
      } else {
        // Show RGB values - only show if not black to reduce clutter
        if (pixel.r === 0 && pixel.g === 0 && pixel.b === 0) {
          element.textContent = "";
          element.style.color = "#333";
        } else {
          element.textContent = `${pixel.r},${pixel.g},${pixel.b}`;
          element.style.color = `rgb(${Math.max(pixel.r, 100)}, ${Math.max(
            pixel.g,
            100
          )}, ${Math.max(pixel.b, 100)})`;
        }
      }

      // Set background color to actual pixel color (dimmed)
      element.style.backgroundColor = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, 0.3)`;
    }
  }
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  const toHex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Export matrix as JSON
function exportMatrix() {
  if (!currentMatrix) return;

  const dataStr = JSON.stringify(currentMatrix, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `led_matrix_frame_${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

// Global function to get matrix (for LED matrix use)
function getAnimationMatrix(animationName, frameNumber) {
  return animationEngine
    ? animationEngine.getAnimationMatrix(animationName, frameNumber)
    : null;
}

// Initialize when DOM is loaded
let animationEngine;

function initAnimations() {
  const canvas = document.getElementById("gameCanvas");
  const animationSelect = document.getElementById("animationSelect");
  const hueSlider = document.getElementById("hueSlider");
  const hueValue = document.getElementById("hueValue");

  // Matrix visualization elements
  const toggleFormatBtn = document.getElementById("toggleFormat");
  const exportBtn = document.getElementById("exportMatrix");
  const frameNumberSpan = document.getElementById("frameNumber");
  const animationNameSpan = document.getElementById("animationName");

  // Create the matrix grid
  createMatrixGrid();

  animationEngine = new PixelAnimationEngine(canvas);

  // Set up matrix update callback
  animationEngine.setMatrixUpdateCallback((matrix, animationType, frame) => {
    renderMatrix(matrix);
    frameNumberSpan.textContent = frame;
    animationNameSpan.textContent = animationType;
  });

  animationSelect.addEventListener("change", (e) => {
    animationEngine.startAnimation(e.target.value);
    animationNameSpan.textContent = e.target.value;
  });

  hueSlider.addEventListener("input", (e) => {
    const hue = parseInt(e.target.value);
    hueValue.textContent = `${hue}°`;
    animationEngine.setHueShift(hue);
  });

  toggleFormatBtn.addEventListener("click", () => {
    hexFormat = !hexFormat;
    toggleFormatBtn.textContent = hexFormat ? "RGB Format" : "Hex Format";
    toggleFormatBtn.classList.toggle("active", hexFormat);

    // Re-render with new format
    if (currentMatrix) {
      renderMatrix(currentMatrix);
    }
  });

  exportBtn.addEventListener("click", () => {
    exportMatrix();
  });

  // Start with Pacman
  animationEngine.startAnimation("pacman");
  animationEngine.gameLoop(0);
}

// Auto-initialize if DOM is already loaded, otherwise wait for it
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnimations);
} else {
  initAnimations();
}
