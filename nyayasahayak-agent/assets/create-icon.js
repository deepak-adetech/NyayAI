/**
 * Creates icon.png (1024x1024) using Canvas API via Node.js
 * Run: node assets/create-icon.js
 */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const SIZE = 1024;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext("2d");

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Background ────────────────────────────────────────────────────────────
const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
bgGrad.addColorStop(0, "#0d1f40");
bgGrad.addColorStop(0.5, "#16325e");
bgGrad.addColorStop(1, "#1a3a6b");

roundRect(0, 0, SIZE, SIZE, 220);
ctx.fillStyle = bgGrad;
ctx.fill();
ctx.save();
ctx.clip(); // keep everything inside rounded rect

// ── Subtle inner light ────────────────────────────────────────────────────
const innerLight = ctx.createRadialGradient(512, 340, 40, 512, 340, 600);
innerLight.addColorStop(0, "rgba(100,160,255,0.08)");
innerLight.addColorStop(1, "rgba(0,0,0,0)");
ctx.fillStyle = innerLight;
ctx.fillRect(0, 0, SIZE, SIZE);

// ── Helper: gold gradient ─────────────────────────────────────────────────
function goldGrad(x1, y1, x2, y2) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, "#f7d060");
  g.addColorStop(0.5, "#e8a800");
  g.addColorStop(1, "#f7d060");
  return g;
}

// ── Balance beam post ────────────────────────────────────────────────────
// Vertical rod
ctx.fillStyle = goldGrad(498, 200, 530, 720);
roundRect(498, 210, 28, 520, 14);
ctx.fill();

// ── Horizontal beam ──────────────────────────────────────────────────────
ctx.fillStyle = goldGrad(180, 290, 844, 316);
roundRect(180, 288, 664, 28, 14);
ctx.fill();

// ── Top ornament ─────────────────────────────────────────────────────────
// Outer gold circle
ctx.fillStyle = goldGrad(476, 194, 548, 266);
ctx.beginPath();
ctx.arc(512, 226, 40, 0, Math.PI * 2);
ctx.fill();
// Inner white glow
ctx.fillStyle = "#fffde8";
ctx.beginPath();
ctx.arc(512, 226, 22, 0, Math.PI * 2);
ctx.fill();
// Center dot
ctx.fillStyle = goldGrad(500, 214, 524, 238);
ctx.beginPath();
ctx.arc(512, 226, 11, 0, Math.PI * 2);
ctx.fill();

// ── Hanging chains ───────────────────────────────────────────────────────
function drawChain(x1, y1, x2, y2) {
  ctx.strokeStyle = goldGrad(x1, y1, x2, y2);
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
drawChain(278, 316, 258, 430);
drawChain(258, 430, 266, 480);
drawChain(746, 316, 766, 430);
drawChain(766, 430, 756, 480);

// ── Scale pans ───────────────────────────────────────────────────────────
function drawPan(cx, cy) {
  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  // Pan bowl (arc)
  const panGrad = ctx.createLinearGradient(cx - 120, cy - 20, cx + 120, cy + 30);
  panGrad.addColorStop(0, "#f0f8ff");
  panGrad.addColorStop(0.5, "#ffffff");
  panGrad.addColorStop(1, "#c8dff5");

  ctx.fillStyle = panGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 118, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pan rim
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 118, cy);
  ctx.quadraticCurveTo(cx, cy + 40, cx + 118, cy);
  ctx.stroke();

  // Pan highlight
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 76, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

drawPan(266, 476);   // left pan
drawPan(758, 476);   // right pan

// ── Plinth / base ────────────────────────────────────────────────────────
ctx.shadowColor = "rgba(0,0,0,0.3)";
ctx.shadowBlur = 16;
ctx.shadowOffsetY = 4;

const baseGrad = goldGrad(300, 710, 724, 790);
ctx.fillStyle = baseGrad;
roundRect(398, 722, 228, 18, 9);
ctx.fill();
roundRect(356, 736, 312, 26, 13);
ctx.fill();
roundRect(310, 756, 404, 30, 15);
ctx.fill();

ctx.shadowColor = "transparent";
ctx.shadowBlur = 0;
ctx.shadowOffsetY = 0;

// ── Law books ─────────────────────────────────────────────────────────────
const books = [
  { x: 284, y: 788, w: 62, h: 98,  spine: "#b03a2e", cover: "#c0392b" },
  { x: 354, y: 778, w: 62, h: 108, spine: "#154360", cover: "#1a5276" },
  { x: 608, y: 780, w: 62, h: 106, spine: "#196f3d", cover: "#1e8449" },
  { x: 668, y: 790, w: 62, h: 96,  spine: "#6c3483", cover: "#7d3c98" },
];

books.forEach(({ x, y, w, h, spine, cover }) => {
  // Cover
  ctx.fillStyle = cover;
  roundRect(x, y, w, h, 5);
  ctx.fill();
  // Spine
  ctx.fillStyle = spine;
  roundRect(x, y, 13, h, 4);
  ctx.fill();
  // Pages lines
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 3; i++) {
    roundRect(x + 18, y + 16 + i * 12, 32, 3, 1);
    ctx.fill();
  }
});

// ── Sync arrow ───────────────────────────────────────────────────────────
// Circular sync arrows centered between pans and base
const syncX = 512;
const syncY = 604;
const R = 54;

ctx.strokeStyle = goldGrad(syncX - R, syncY - R, syncX + R, syncY + R);
ctx.lineWidth = 13;
ctx.lineCap = "round";

// Top arc (left to right)
ctx.beginPath();
ctx.arc(syncX, syncY, R, Math.PI * 1.15, Math.PI * 0.1, false);
ctx.stroke();
// Arrow head top-right
ctx.fillStyle = "#e8a800";
ctx.save();
ctx.translate(syncX + R * Math.cos(0.1), syncY + R * Math.sin(0.1));
ctx.rotate(Math.PI * 0.6);
ctx.beginPath();
ctx.moveTo(0, -14);
ctx.lineTo(10, 8);
ctx.lineTo(-10, 8);
ctx.closePath();
ctx.fill();
ctx.restore();

// Bottom arc (right to left)
ctx.beginPath();
ctx.arc(syncX, syncY, R, Math.PI * 0.15, Math.PI * 1.1, true);
ctx.stroke();
// Arrow head bottom-left
ctx.save();
ctx.translate(syncX + R * Math.cos(Math.PI * 1.1), syncY + R * Math.sin(Math.PI * 1.1));
ctx.rotate(Math.PI * 1.6);
ctx.beginPath();
ctx.moveTo(0, -14);
ctx.lineTo(10, 8);
ctx.lineTo(-10, 8);
ctx.closePath();
ctx.fill();
ctx.restore();

// ── Inner border ─────────────────────────────────────────────────────────
ctx.restore(); // restore clip
roundRect(0, 0, SIZE, SIZE, 220);
ctx.strokeStyle = "rgba(245,200,66,0.15)";
ctx.lineWidth = 5;
ctx.stroke();

// ── Write output ─────────────────────────────────────────────────────────
const outPath = path.join(__dirname, "icon.png");
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buf);
console.log(`✅ icon.png written (${(buf.length / 1024).toFixed(0)} KB) → ${outPath}`);
