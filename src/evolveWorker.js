importScripts("constants.js");
const random = Math.random;

const evolveP = ({ x, y, dir }) => {
  const vx = Math.sin(dir);
  const vy = Math.cos(dir);
  
  x = Math.max(0, Math.min(W, x + vx, W));
  y = Math.max(0, Math.min(H, y + vy, H));

  // Random bounce of walls
  if (x === 0 || x === W || y === 0 || y === H) 
    dir = random() * 2 * Math.PI;
  
  return { x, y, dir };
}

const evolvePSmart = (imgData) => (p) => {
  const pM = evolveP(p);
  
  const xL = Math.floor(pM.x + Math.sin(pM.dir - FOV / 2) * SO);
  const yL = Math.floor(pM.y + Math.cos(pM.dir - FOV / 2) * SO);

  const xM = Math.floor(pM.x + Math.sin(pM.dir) * SO);
  const yM = Math.floor(pM.y + Math.cos(pM.dir) * SO);

  const xR = Math.floor(pM.x + Math.sin(pM.dir + FOV / 2) * SO);
  const yR = Math.floor(pM.y + Math.cos(pM.dir + FOV / 2) * SO);
  
  // Find the brightest pixel for all 3 variants
  const piL = (yL * W * 4) + (xL * 4);
  const piM = (yM * W * 4) + (xM * 4);
  const piR = (yR * W * 4) + (xR * 4);
  
  const bL = imgData[piL + 0] + imgData[piL + 1] + imgData[piL + 2];
  const bM = imgData[piM + 0] + imgData[piM + 1] + imgData[piM + 2];
  const bR = imgData[piR + 0] + imgData[piR + 1] + imgData[piR + 2];

  let newDir = pM.dir;
  const steerC = C;

  if (bM > bL && bM > bR) {
    // Keep on going if mid pixel is brightest
    newDir =  pM.dir;
  } else if (bM < bL && bM < bR) {
    // Both sides are better, randomly pick one
    const lr = random() > 0.5 ? 1 : -1;
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

this.addEventListener("message", function(e) {
  const { imgData, particles, groupId } = e.data;

  this.postMessage({ 
    groupId,
    particles: particles.map(evolvePSmart(imgData))
  });
});