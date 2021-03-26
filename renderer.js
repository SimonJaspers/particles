Math.random = (function () {
  var seed = 123456;
  return function () {
    // Robert Jenkins' 32 bit integer hash function.
    seed = seed & 0xffffffff
    seed = (seed + 0x7ed55d16 + (seed << 12)) & 0xffffffff
    seed = (seed ^ 0xc761c23c ^ (seed >>> 19)) & 0xffffffff
    seed = (seed + 0x165667b1 + (seed << 5)) & 0xffffffff
    seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff
    seed = (seed + 0xfd7046c5 + (seed << 3)) & 0xffffffff
    seed = (seed ^ 0xb55a4f09 ^ (seed >>> 16)) & 0xffffffff
    return (seed & 0xfffffff) / 0x10000000
  }
})()

const W = 200;
const H = 200;
const D = 0.01; // Decay
const B = 1; // Blur size
const P = Math.floor(W * H * 0.05); // Particle count
const FOV = Math.PI / 8; // Field of view in rad
const C = Math.PI / 8; // Correction angle when particle wants to steer left/right
const SO = 9 // Sensor offset
const cvs = document.createElement("canvas");
cvs.width = W;
cvs.height = H;

const DECAY_COLOR = `rgba(0, 0, 0, ${D})`;

const ctx = cvs.getContext("2d");

document.body.appendChild(cvs);
ctx.fillStyle = "rgba(0,0,0,1)";
ctx.fillRect(0, 0, W, H);

// White dot in middle for testing
ctx.fillStyle = "white";
ctx.fillRect((W - 1) / 2, (H - 1) / 2, 1, 1);

const Particle = () => {
  const randomAngle = Math.random() * 2 * Math.PI;
  
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    dir: randomAngle
  }
}

let particles = Array.from({ length: P }, Particle);

const evolveP = ({ x, y, dir }) => {
  const vx = Math.sin(dir);
  const vy = Math.cos(dir);
  
  x = Math.max(0, Math.min(W, x + vx, W));
  y = Math.max(0, Math.min(H, y + vy, H));

  // Random bounce of walls
  if (x === 0 || x === W || y === 0 || y === H) 
    dir = Math.random() * 2 * Math.PI;
  
  return { x, y, dir };
}

// https://uwe-repository.worktribe.com/output/980579
const evolvePSmart = ({ x, y, dir }) => {
  const pM = evolveP({x, y, dir });
  
  const xL = pM.x + Math.sin(pM.dir - FOV / 2) * SO;
  const yL = pM.y + Math.cos(pM.dir - FOV / 2) * SO;

  const xM = pM.x + Math.sin(pM.dir) * SO;
  const yM = pM.y + Math.cos(pM.dir) * SO;

  const xR = pM.x + Math.sin(pM.dir + FOV / 2) * SO;
  const yR = pM.y + Math.cos(pM.dir + FOV / 2) * SO;
  
  // Find the brightest pixel for all 3 variants
  const rgbaL = ctx.getImageData(xL, yL, 1, 1).data;
  const rgbaM = ctx.getImageData(xM, yM, 1, 1).data;
  const rgbaR = ctx.getImageData(xR, yR, 1, 1).data;
  
  const bL = rgbaL[0] + rgbaL[1] + rgbaL[2];
  const bM = rgbaM[0] + rgbaM[1] + rgbaM[2];
  const bR = rgbaR[0] + rgbaR[1] + rgbaR[2];
  

  let newDir = pM.dir;
  const randomSteerStrength = Math.random();
  const steerC = C;//C * randomSteerStrength;

  if (bM > bL && bM > bR) {
    // Keep on going if mid pixel is brightest
    newDir =  pM.dir;
  } else if (bM < bL && bM < bR) {
    // Both sides are better, randomly pick one
    const lr = Math.random() > 0.5 ? 1 : -1;
    newDir = pM.dir + lr * steerC;
  } else if (bL > bR) {
    // Left is best
    newDir = pM.dir - steerC;  
  } else if (bR > bL) {
    newDir = pM.dir + steerC;
  }
  
  return {
    x: pM.x, y: pM.y, dir: newDir
  }
}

const drawP = ({ x, y }) => {
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

const blur = () => {
  const d = ctx.getImageData(0, 0, W, H).data;
  const newD = ctx.createImageData(W, H);
  
  for (let i = 0; i < d.length; i += 4) {
    const x = (i / 4) % W;
    const y = Math.floor((i / 4) / H);
    
    const topY = Math.max(0, y - B);
    const leftX = Math.max(0, x - B);
    const bottomY = Math.min(H - 1, y + B);
    const rightX = Math.min(W - 1, x + B);
    
    let channelSum = 0;
    let pxCount = 0;
    for (let py = topY; py <= bottomY; py += 1) {
      for (let px = leftX; px <= rightX; px += 1) {
        const pi = (py * W * 4) + px * 4;
        const r = d[pi + 0];
        const g = d[pi + 1];
        const b = d[pi + 2];
        
        pxCount += 1;
        channelSum += (r + g + b);
      }
    }

    const s = 1 + B + B;
    const avgColor = Math.floor(channelSum / (3 * s * s));
    const newPx = newD.data;
    newPx[i + 0] = avgColor;
    newPx[i + 1] = avgColor;
    newPx[i + 2] = avgColor;
    newPx[i + 3] = 255;
  }
  
  ctx.putImageData(newD, 0, 0);
}

const frame = () => {
  // Evolve
  particles = particles.map(evolvePSmart);

  // Fade
  ctx.fillStyle = DECAY_COLOR;
  ctx.fillRect(0, 0, W, H);
  
  // Blur
  blur();

  // Draw particles
  ctx.fillStyle = "rgba(255,255,255,1)";
  particles.forEach(drawP);
}

const loop = () => {
  try {
    frame();
  } catch(e) {
    console.log("Error in drawing frame");
    console.log(e);
    return;
  }
  
  requestAnimationFrame(loop);
}

console.log("GO");
loop();
