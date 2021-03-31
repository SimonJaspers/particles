import { random } from "./random.js";

// Warning: need to be in sync with constants.js
const W = 500;
const H = 500;
const D = 0.01; // Decay
const B = 1; // Blur size
const P = Math.floor(W * H * 0.15); // Particle count
const T_COUNT = 6;

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
  const randomAngle = random() * 2 * Math.PI;
  
  return {
    x: random() * W,
    y: random() * H,
    dir: randomAngle
  }
}

const particleGroups = Array.from(
  { length: T_COUNT },
  () => Array.from(
    { length: Math.floor(P / T_COUNT) },
    Particle
  )
);

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

const framerateIndicator = document.createElement("pre");
document.body.appendChild(framerateIndicator);

const workers = Array.from({ length: T_COUNT }, () => new Worker("./src/evolveWorker.js"));
let handled = new Set();
let t0;
let nextParticles = [];

workers.forEach(w => w.addEventListener("message", e => {
  // Add all particles
  particleGroups[e.data.groupId] = e.data.particles;
  
  // Add group Id
  handled.add(e.data.groupId);

  if (handled.size === T_COUNT) {

    // Clear for next frame
    handled = new Set();
    nextParticles = [];
  
    // Fade
    ctx.fillStyle = DECAY_COLOR;
    ctx.fillRect(0, 0, W, H);
    
    // Blur
    blur();
  
    // Draw particles
    ctx.fillStyle = "rgba(255,255,255,1)";
    particleGroups.forEach(group => group.forEach(drawP));

    const t1 = performance.now()
    const frameTime = t1 - t0;
    framerateIndicator.innerText = Math.round(1000 / frameTime) + "fps";

    requestAnimationFrame(frame);
  }
}));


const frame = () => {
  t0 = performance.now();

  const imgData = ctx.getImageData(0, 0, W, H).data;
  particleGroups.forEach((particles, i) => {
    workers[i].postMessage({ 
      groupId: i,
      imgData,
      particles
     });
  })
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
//loop();
frame();
