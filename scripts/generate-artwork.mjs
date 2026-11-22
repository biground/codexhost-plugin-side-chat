/**
 * Deterministic zero-dependency PNG artwork generator for Side Chat (/btw).
 * Generates:
 *   - assets/icon.png (128x128 RGBA PNG, <= 128 KiB)
 *   - assets/preview.png (960x540 RGBA PNG, <= 512 KiB)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = resolve(root, "assets");
mkdirSync(assetsDir, { recursive: true });

// ---------------------------------------------------------------------------
// Minimal deterministic RGBA PNG encoder (IHDR + IDAT + IEND)
// ---------------------------------------------------------------------------
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngRgba(width, height, rgba) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0 (None)
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 2D Anti-aliased Canvas Rasterizer
// ---------------------------------------------------------------------------
function createCanvas(width, height) {
  const data = Buffer.alloc(width * height * 4, 0);

  function blendPixel(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= width || y >= height || a <= 0) return;
    const idx = (y * width + x) * 4;
    const sa = a / 255;
    const da = data[idx + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    data[idx] = Math.round((r * sa + data[idx] * da * (1 - sa)) / outA);
    data[idx + 1] = Math.round((g * sa + data[idx + 1] * da * (1 - sa)) / outA);
    data[idx + 2] = Math.round((b * sa + data[idx + 2] * da * (1 - sa)) / outA);
    data[idx + 3] = Math.round(outA * 255);
  }

  function sdRoundedBox(px, py, cx, cy, hw, hh, r) {
    const qx = Math.abs(px - cx) - hw + r;
    const qy = Math.abs(py - cy) - hh + r;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function fillRoundedRect(x, y, w, h, radius, colorFn) {
    const r = Math.min(radius, w / 2, h / 2);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const hw = w / 2;
    const hh = h / 2;
    const x0 = Math.max(0, Math.floor(x - 1));
    const y0 = Math.max(0, Math.floor(y - 1));
    const x1 = Math.min(width - 1, Math.ceil(x + w + 1));
    const y1 = Math.min(height - 1, Math.ceil(y + h + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = sdRoundedBox(px + 0.5, py + 0.5, cx, cy, hw, hh, r);
        const cov = Math.max(0, Math.min(1, 0.5 - d));
        if (cov > 0) {
          const [cr, cg, cb, ca = 255] = colorFn(px, py);
          blendPixel(px, py, cr, cg, cb, Math.round(ca * cov));
        }
      }
    }
  }

  function strokeRoundedRect(x, y, w, h, radius, thickness, color) {
    const r = Math.min(radius, w / 2, h / 2);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const hw = w / 2;
    const hh = h / 2;
    const x0 = Math.max(0, Math.floor(x - thickness - 1));
    const y0 = Math.max(0, Math.floor(y - thickness - 1));
    const x1 = Math.min(width - 1, Math.ceil(x + w + thickness + 1));
    const y1 = Math.min(height - 1, Math.ceil(y + h + thickness + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.abs(sdRoundedBox(px + 0.5, py + 0.5, cx, cy, hw, hh, r)) - thickness / 2;
        const cov = Math.max(0, Math.min(1, 0.5 - d));
        if (cov > 0) {
          blendPixel(px, py, color[0], color[1], color[2], Math.round((color[3] ?? 255) * cov));
        }
      }
    }
  }

  function fillCircle(cx, cy, radius, color) {
    const x0 = Math.max(0, Math.floor(cx - radius - 1));
    const y0 = Math.max(0, Math.floor(cy - radius - 1));
    const x1 = Math.min(width - 1, Math.ceil(cx + radius + 1));
    const y1 = Math.min(height - 1, Math.ceil(cy + radius + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy) - radius;
        const cov = Math.max(0, Math.min(1, 0.5 - d));
        if (cov > 0) {
          blendPixel(px, py, color[0], color[1], color[2], Math.round((color[3] ?? 255) * cov));
        }
      }
    }
  }

  function fillRect(x, y, w, h, color) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(width, Math.ceil(x + w));
    const y1 = Math.min(height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        blendPixel(px, py, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }

  function drawLine(x1, y1, x2, y2, thickness, color) {
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - thickness - 1));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2) + thickness + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - thickness - 1));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2) + thickness + 1));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const t = Math.max(0, Math.min(1, ((px + 0.5 - x1) * dx + (py + 0.5 - y1) * dy) / lenSq));
        const dist = Math.hypot(px + 0.5 - (x1 + t * dx), py + 0.5 - (y1 + t * dy)) - thickness / 2;
        const cov = Math.max(0, Math.min(1, 0.5 - dist));
        if (cov > 0) {
          blendPixel(px, py, color[0], color[1], color[2], Math.round((color[3] ?? 255) * cov));
        }
      }
    }
  }

  return { data, fillRoundedRect, strokeRoundedRect, fillCircle, fillRect, drawLine };
}

// 5x7 crisp bitmap font for UI labels
const FONT_5X7 = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ":": [0, 4, 4, 0, 4, 4, 0],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  0: [14, 17, 19, 21, 25, 17, 14],
  2: [14, 17, 1, 6, 8, 16, 31],
};

function drawText(canvas, text, x, y, scale, color) {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT_5X7[ch] ?? FONT_5X7[" "];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          canvas.fillRect(cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const grad = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), 255];

// ---------------------------------------------------------------------------
// 1. Generate assets/icon.png (128x128)
// ---------------------------------------------------------------------------
function generateIcon() {
  const W = 128;
  const H = 128;
  const c = createCanvas(W, H);

  // Dark rounded square card
  c.fillRoundedRect(6, 6, 116, 116, 28, (x, y) => grad([15, 23, 42], [30, 41, 59], (x + y) / 256));
  c.strokeRoundedRect(6, 6, 116, 116, 28, 2, [56, 189, 248, 80]);

  // Primary conversation bubble (upper-left)
  c.fillRoundedRect(22, 26, 68, 46, 14, (x, y) => grad([37, 99, 235], [56, 189, 248], (x - 22) / 68));
  // Bubble lines
  c.fillRoundedRect(34, 40, 42, 6, 3, () => [255, 255, 255, 230]);
  c.fillRoundedRect(34, 53, 28, 6, 3, () => [255, 255, 255, 175]);

  // Fork branch connector
  c.drawLine(56, 72, 56, 86, 4, [56, 189, 248, 220]);
  c.drawLine(56, 86, 70, 86, 4, [56, 189, 248, 220]);

  // Side Chat (/btw) secondary bubble (lower-right, emerald-cyan accent)
  c.fillRoundedRect(54, 62, 54, 42, 13, (x, y) => grad([15, 23, 42], [17, 24, 39], (y - 62) / 42));
  c.strokeRoundedRect(54, 62, 54, 42, 13, 2.5, [16, 185, 129, 240]);

  // "/B" crisp emblem inside side bubble
  drawText(c, "/BTW", 61, 76, 2, [110, 231, 183, 255]);

  const png = encodePngRgba(W, H, c.data);
  writeFileSync(resolve(assetsDir, "icon.png"), png);
  return png;
}

// ---------------------------------------------------------------------------
// 2. Generate assets/preview.png (960x540)
// ---------------------------------------------------------------------------
function generatePreview() {
  const W = 960;
  const H = 540;
  const c = createCanvas(W, H);

  // Background gradient
  c.fillRoundedRect(0, 0, W, H, 0, (x, y) => grad([11, 17, 32], [19, 28, 49], (x * 0.4 + y * 0.6) / 960));

  // Main Workbench Window Card
  c.fillRoundedRect(36, 30, 680, 476, 18, () => [15, 23, 42, 255]);
  c.strokeRoundedRect(36, 30, 680, 476, 18, 2, [148, 163, 184, 55]);

  // Window Topbar
  c.fillRoundedRect(36, 30, 680, 52, 18, () => [24, 34, 56, 255]);
  c.fillCircle(64, 56, 6, [248, 113, 113, 220]);
  c.fillCircle(84, 56, 6, [251, 191, 36, 220]);
  c.fillCircle(104, 56, 6, [52, 211, 153, 220]);
  drawText(c, "SIDE CHAT (/BTW)", 130, 49, 2, [241, 245, 249, 255]);
  // V2 badge
  c.fillRoundedRect(622, 42, 74, 28, 14, () => [37, 99, 235, 50]);
  c.strokeRoundedRect(622, 42, 74, 28, 14, 1.5, [96, 165, 250, 180]);
  drawText(c, "V0.2", 636, 49, 2, [147, 197, 253, 255]);

  // Left Sidebar inside Workbench
  c.fillRoundedRect(50, 96, 220, 396, 12, () => [22, 32, 52, 255]);
  c.strokeRoundedRect(50, 96, 220, 396, 12, 1, [148, 163, 184, 35]);

  // Filter pills: ALL / PERSISTENT / EPHEMERAL
  c.fillRoundedRect(62, 110, 44, 24, 8, () => [37, 99, 235, 220]);
  drawText(c, "ALL", 70, 117, 1.5, [255, 255, 255, 255]);
  c.fillRoundedRect(112, 110, 74, 24, 8, () => [16, 185, 129, 36]);
  drawText(c, "PERSIST", 118, 117, 1.5, [110, 231, 183, 255]);
  c.fillRoundedRect(192, 110, 66, 24, 8, () => [245, 158, 11, 36]);
  drawText(c, "EPHEM", 200, 117, 1.5, [252, 211, 77, 255]);

  // Branch item 1 (Selected, Persistent)
  c.fillRoundedRect(62, 148, 196, 74, 10, () => [30, 58, 138, 95]);
  c.strokeRoundedRect(62, 148, 196, 74, 10, 1.5, [96, 165, 250, 180]);
  c.fillRoundedRect(74, 160, 104, 10, 4, () => [241, 245, 249, 210]);
  c.fillRoundedRect(74, 178, 148, 8, 4, () => [148, 163, 184, 140]);
  c.fillRoundedRect(74, 196, 86, 18, 9, () => [16, 185, 129, 55]);
  drawText(c, "PERSISTENT", 82, 200, 1.2, [110, 231, 183, 255]);

  // Branch item 2 (Ephemeral)
  c.fillRoundedRect(62, 234, 196, 74, 10, () => [30, 41, 59, 180]);
  c.strokeRoundedRect(62, 234, 196, 74, 10, 1, [148, 163, 184, 30]);
  c.fillRoundedRect(74, 246, 122, 10, 4, () => [226, 232, 240, 180]);
  c.fillRoundedRect(74, 264, 136, 8, 4, () => [148, 163, 184, 110]);
  c.fillRoundedRect(74, 282, 82, 18, 9, () => [245, 158, 11, 50]);
  drawText(c, "EPHEMERAL", 82, 286, 1.2, [252, 211, 77, 255]);

  // Branch item 3 (Persistent)
  c.fillRoundedRect(62, 320, 196, 74, 10, () => [30, 41, 59, 150]);
  c.fillRoundedRect(74, 332, 96, 10, 4, () => [226, 232, 240, 160]);
  c.fillRoundedRect(74, 350, 140, 8, 4, () => [148, 163, 184, 100]);
  c.fillRoundedRect(74, 368, 86, 18, 9, () => [16, 185, 129, 45]);
  drawText(c, "PERSISTENT", 82, 372, 1.2, [110, 231, 183, 255]);

  // Right Pane Conversation Area
  c.fillRoundedRect(284, 96, 418, 396, 12, () => [17, 24, 39, 255]);
  c.strokeRoundedRect(284, 96, 418, 396, 12, 1, [148, 163, 184, 35]);

  // Right Pane Header with Permanent Badge
  c.fillRoundedRect(298, 110, 390, 40, 8, () => [30, 41, 59, 170]);
  c.fillRoundedRect(310, 124, 150, 12, 5, () => [241, 245, 249, 220]);
  c.fillRoundedRect(584, 118, 92, 24, 12, () => [16, 185, 129, 55]);
  c.strokeRoundedRect(584, 118, 92, 24, 12, 1, [16, 185, 129, 180]);
  drawText(c, "PERSISTENT", 594, 125, 1.3, [110, 231, 183, 255]);

  // User Bubble (right-aligned)
  c.fillRoundedRect(424, 166, 260, 56, 12, (x, y) => grad([37, 99, 235], [59, 130, 246], (x - 424) / 260));
  c.fillRoundedRect(442, 182, 210, 9, 4, () => [255, 255, 255, 235]);
  c.fillRoundedRect(442, 198, 150, 9, 4, () => [255, 255, 255, 180]);

  // Assistant Bubble + Collapsible Tool Card (left-aligned)
  c.fillRoundedRect(300, 238, 336, 164, 12, () => [30, 41, 59, 235]);
  c.strokeRoundedRect(300, 238, 336, 164, 12, 1, [148, 163, 184, 45]);
  // Collapsible thinking/tool sub-card
  c.fillRoundedRect(314, 252, 308, 42, 8, () => [15, 23, 42, 220]);
  c.strokeRoundedRect(314, 252, 308, 42, 8, 1, [56, 189, 248, 80]);
  c.fillCircle(330, 273, 6, [56, 189, 248, 220]);
  c.fillRoundedRect(346, 268, 160, 10, 4, () => [148, 163, 184, 180]);
  // Response text lines
  c.fillRoundedRect(314, 310, 290, 10, 4, () => [241, 245, 249, 215]);
  c.fillRoundedRect(314, 330, 260, 10, 4, () => [226, 232, 240, 190]);
  c.fillRoundedRect(314, 350, 278, 10, 4, () => [226, 232, 240, 190]);
  c.fillRoundedRect(314, 370, 180, 10, 4, () => [148, 163, 184, 160]);

  // Composer Box at bottom of Right Pane
  c.fillRoundedRect(298, 420, 390, 56, 10, () => [24, 34, 56, 255]);
  c.strokeRoundedRect(298, 420, 390, 56, 10, 1.5, [96, 165, 250, 120]);
  drawText(c, "/BTW", 314, 441, 2, [96, 165, 250, 255]);
  c.fillRoundedRect(378, 443, 196, 10, 4, () => [148, 163, 184, 120]);
  c.fillRoundedRect(614, 431, 62, 34, 8, () => [37, 99, 235, 255]);
  drawText(c, "SEND", 624, 442, 1.7, [255, 255, 255, 255]);

  // Floating Widget Drawer Overlay (Right side)
  c.fillRoundedRect(620, 128, 304, 382, 16, () => [15, 23, 42, 250]);
  c.strokeRoundedRect(620, 128, 304, 382, 16, 2, [56, 189, 248, 180]);
  c.fillRoundedRect(620, 128, 304, 46, 16, () => [24, 34, 56, 255]);
  drawText(c, "WIDGET DRAWER", 638, 144, 1.8, [241, 245, 249, 255]);
  c.fillRoundedRect(824, 139, 86, 22, 11, () => [245, 158, 11, 55]);
  drawText(c, "EPHEM", 838, 145, 1.4, [252, 211, 77, 255]);

  // Drawer messages
  c.fillRoundedRect(688, 192, 218, 44, 10, (x) => grad([37, 99, 235], [56, 189, 248], (x - 688) / 218));
  c.fillRoundedRect(704, 208, 170, 9, 4, () => [255, 255, 255, 225]);
  c.fillRoundedRect(638, 252, 246, 120, 10, () => [30, 41, 59, 235]);
  c.fillRoundedRect(654, 270, 200, 9, 4, () => [241, 245, 249, 210]);
  c.fillRoundedRect(654, 290, 180, 9, 4, () => [226, 232, 240, 180]);
  c.fillRoundedRect(654, 310, 190, 9, 4, () => [226, 232, 240, 180]);
  c.fillRoundedRect(654, 330, 120, 9, 4, () => [148, 163, 184, 150]);

  // Drawer composer
  c.fillRoundedRect(638, 440, 268, 52, 10, () => [24, 34, 56, 255]);
  c.strokeRoundedRect(638, 440, 268, 52, 10, 1, [148, 163, 184, 65]);
  c.fillRoundedRect(652, 461, 160, 9, 4, () => [148, 163, 184, 120]);
  c.fillRoundedRect(840, 450, 54, 32, 8, () => [16, 185, 129, 230]);

  const png = encodePngRgba(W, H, c.data);
  writeFileSync(resolve(assetsDir, "preview.png"), png);
  return png;
}

const iconPng = generateIcon();
const previewPng = generatePreview();
console.log(
  `Generated deterministic PNG artwork: assets/icon.png (${iconPng.length} bytes), assets/preview.png (${previewPng.length} bytes)`,
);
