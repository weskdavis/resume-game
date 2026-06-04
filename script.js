const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const scenes = window.RESUME_SCENES || [];

const ui = {
  count: document.querySelector("#scene-count"),
  type: document.querySelector("#scene-type"),
  capability: document.querySelector("#scene-capability"),
  title: document.querySelector("#scene-title"),
  story: document.querySelector("#scene-story"),
  place: document.querySelector("#scene-place"),
  artifact: document.querySelector("#scene-artifact"),
  points: document.querySelector("#scene-points"),
  timeline: document.querySelector("#timeline"),
  hud: document.querySelector(".hud"),
  hudToggle: document.querySelector("#hud-toggle"),
  brand: document.querySelector(".brand"),
  prev: document.querySelector("#prev-scene"),
  next: document.querySelector("#next-scene"),
  email: document.querySelector("#email-button"),
  finalOverlay: document.querySelector("#final-overlay"),
  finalEmail: document.querySelector("#final-email-button"),
  finalPrint: document.querySelector("#final-print-button"),
  finalStatus: document.querySelector("#final-status")
};

const keys = new Set();
const particles = [];
const world = {
  sceneWidth: 920,
  ground: 414,
  width: 920 * scenes.length
};

function isIntroScene(sceneOrIndex) {
  const scene = typeof sceneOrIndex === "number" ? scenes[sceneOrIndex] : sceneOrIndex;
  return scene?.visual === "intro";
}

function isOutroScene(sceneOrIndex) {
  const scene = typeof sceneOrIndex === "number" ? scenes[sceneOrIndex] : sceneOrIndex;
  return scene?.visual === "unknown";
}

function isPlayableScene(scene) {
  return !isIntroScene(scene) && !isOutroScene(scene);
}

function playableScenes() {
  return scenes.filter(isPlayableScene);
}

function playableLevelNumber(index) {
  return scenes.slice(0, index + 1).filter(isPlayableScene).length;
}

function finalSceneIndex() {
  return scenes.findIndex(isOutroScene);
}

function lastPlayableSceneIndex() {
  for (let index = scenes.length - 1; index >= 0; index -= 1) {
    if (isPlayableScene(scenes[index])) return index;
  }
  return scenes.length - 1;
}

function smoothStep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function introWalkProgress(left = 0) {
  return Math.max(0, Math.min(1, (player.x - (left + 92)) / 640));
}

const player = {
  x: 92,
  y: world.ground,
  vx: 0,
  vy: 0,
  facing: 1,
  grounded: true,
  tailTimer: 0,
  step: 0
};

let activeScene = 0;
let cameraX = 0;
let lastTime = performance.now();

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width = Math.max(640, Math.floor(rect.width * scale));
  canvas.height = Math.max(360, Math.floor(rect.height * scale));
  ctx.imageSmoothingEnabled = false;
  cameraX = sceneCameraTarget(activeScene);
}

function px(value) {
  return Math.round(value);
}

function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px(x), px(y), px(w), px(h));
}

function text(label, x, y, size = 18, color = "#f4efe5", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.fillText(label, px(x), px(y));
  ctx.textAlign = "left";
}

function centeredWorldText(label, x, y, width, height, size = 18, color = "#f4efe5") {
  const scale = currentScale();
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size * scale}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, px(toScreenX(x + width / 2)), px(toScreenY(y + height / 2)));
  ctx.restore();
}

function currentScale() {
  return canvas.height / 540;
}

function visibleWorldWidth() {
  return canvas.width / currentScale();
}

function sceneCameraTarget(index) {
  const viewWidth = visibleWorldWidth();
  const maxCamera = Math.max(0, world.width - viewWidth);
  if (isIntroScene(index)) return 0;
  if (isOutroScene(index)) return sceneCameraTarget(Math.max(0, index - 1));
  if (scenes[index]?.visual === "codecargo" && viewWidth < 820) {
    const sceneLeft = index * world.sceneWidth;
    const contentCenter = sceneLeft + 448;
    return Math.max(0, Math.min(maxCamera, contentCenter - viewWidth / 2));
  }
  const sceneCenter = index * world.sceneWidth + world.sceneWidth / 2;
  return Math.max(0, Math.min(maxCamera, sceneCenter - viewWidth / 2));
}

function toScreenX(x) {
  return (x - cameraX) * currentScale();
}

function toScreenY(y) {
  return y * currentScale();
}

function rectWorld(x, y, w, h, color) {
  const scale = currentScale();
  fillRect(toScreenX(x), toScreenY(y), w * scale, h * scale, color);
}

function drawScene(scene, index) {
  const left = index * world.sceneWidth;
  const scale = currentScale();
  const screenLeft = toScreenX(left);
  const screenRight = toScreenX(left + world.sceneWidth);

  if (screenRight < -80 || screenLeft > canvas.width + 80) return;

  fillRect(screenLeft, 0, world.sceneWidth * scale, canvas.height, "#f6faf4");
  drawSkywash(left, scene.palette, scene.visual);
  rectWorld(left, world.ground + 34, world.sceneWidth, 130, "#2b241a");
  drawGround(left, scene.palette);
  drawSceneBackground(scene, left, index);
  if (!["intro", "unknown", "pinehurst", "tulane", "law", "redhat", "liferay", "docker", "elastic", "ibm", "codecargo", "next"].includes(scene.visual)) {
    drawArtifact(scene, left + 724, world.ground - 52);
  }
  if (index === activeScene && isPlayableScene(scene)) drawSceneTitle(scene, left, index);
}

function drawSkywash(left, palette, visual) {
  rectWorld(left, 0, world.sceneWidth, 210, "#dff1f8");
  rectWorld(left, 210, world.sceneWidth, 190, "#f6faf4");
  if (visual !== "liferay") {
    drawCloud(left + 112, 72, 1.1);
    drawCloud(left + 570, 52, 0.82);
  }
  rectWorld(left, 0, world.sceneWidth, 8, palette[0]);
}

function drawCloud(x, y, size) {
  const s = size;
  rectWorld(x, y + 22 * s, 132 * s, 22 * s, "rgba(255,255,255,.72)");
  rectWorld(x + 22 * s, y + 6 * s, 44 * s, 42 * s, "rgba(255,255,255,.82)");
  rectWorld(x + 58 * s, y - 8 * s, 58 * s, 58 * s, "rgba(255,255,255,.78)");
  rectWorld(x + 104 * s, y + 12 * s, 54 * s, 34 * s, "rgba(255,255,255,.72)");
  rectWorld(x + 14 * s, y + 42 * s, 128 * s, 8 * s, "rgba(189,220,229,.5)");
}

function drawGround(left, palette, width = world.sceneWidth) {
  rectWorld(left, world.ground + 8, width, 28, "#82b65f");
  rectWorld(left, world.ground + 24, width, 14, "#4f8a3f");
  rectWorld(left, world.ground + 38, width, 12, "#2f6032");
  rectWorld(left, world.ground + 50, width, 92, "#8c623d");
  for (let i = 0; i < Math.ceil(width / 28) + 1; i += 1) {
    const x = left + i * 28;
    rectWorld(x, world.ground + 51, 18, 10 + (i % 3) * 3, "#6f492e");
    rectWorld(x + 10, world.ground + 74 + (i % 2) * 14, 7, 7, "#754f31");
  }
  for (let i = 0; i < Math.ceil(width / 24) + 1; i += 1) {
    rectWorld(left + i * 24, world.ground + 8, 18, 8, i % 3 === 0 ? "#8fc35f" : "#9fcb68");
  }
}

function drawSceneTitle(scene, left, index) {
  const scale = currentScale();
  const boxY = 25 * scale;
  const boxWidth = 322 * scale;
  const boxHeight = 58 * scale;
  const x = Math.max(26 * scale, Math.min(toScreenX(left + 34), canvas.width - boxWidth - 18 * scale));
  const boxX = x - 8 * scale;
  const total = Math.max(1, playableScenes().length);
  const level = playableLevelNumber(index);
  const progress = level / total;
  fillRect(boxX, boxY, boxWidth, boxHeight, "rgba(16,18,22,.28)");
  fillRect(boxX, boxY - 7 * scale, boxWidth, 6 * scale, "rgba(244,239,229,.2)");
  fillRect(boxX, boxY - 7 * scale, boxWidth * progress, 6 * scale, "#e8c872");
  fillRect(boxX + boxWidth * progress - 2 * scale, boxY - 13 * scale, 4 * scale, 18 * scale, "#f4efe5");
  text(`LEVEL ${String(level).padStart(2, "0")}`, x, 48 * scale, 13 * scale, "#101215");
  text(scene.capability, x, 70 * scale, 16 * scale, "#101215");
}

function drawSceneBackground(scene, left, index) {
  if (scene.visual === "intro") drawIntro(left);
  if (scene.visual === "pinehurst") drawPinehurst(left);
  if (scene.visual === "tulane") drawTulane(left);
  if (scene.visual === "law") drawLaw(left);
  if (scene.visual === "redhat") drawRedHat(left);
  if (scene.visual === "liferay") drawLiferay(left);
  if (scene.visual === "docker") drawDocker(left);
  if (scene.visual === "elastic") drawElastic(left);
  if (scene.visual === "ibm") drawIbm(left);
  if (scene.visual === "codecargo") drawCodeCargo(left);
  if (scene.visual === "next") drawNext(left);
  if (scene.visual === "unknown") drawUnknown(left);
  if (!isIntroScene(scene) && !isOutroScene(scene)) rectWorld(left + world.sceneWidth - 2, 0, 2, 540, "rgba(15,17,21,.24)");
}

function drawIntro(left) {
  const span = activeScene === 0 ? Math.max(world.sceneWidth, visibleWorldWidth() + 80) : world.sceneWidth;

  rectWorld(left, 0, span, 210, "#dff1f8");
  rectWorld(left, 210, span, 190, "#f6faf4");
  rectWorld(left, 0, span, 8, "#8ebf8a");
  drawCloud(left + 118, 74, 1.05);
  drawCloud(left + 560, 48, 0.78);

  rectWorld(left, world.ground + 34, span, 130, "#2b241a");
  drawGround(left, null, span);
  rectWorld(left, world.ground - 46, span, 54, "#d7c27e");
  rectWorld(left, world.ground + 4, span, 16, "#9fcb68");

  const pineHeights = [300, 362, 328, 388, 340, 416, 312, 374, 346, 392, 324, 360, 408];
  const pineOffsets = [-36, -10, 12, -22, 20, -8, 18, -16, 10, -14, 22, -6, 16];
  const pineCount = Math.ceil(span / 104) + 1;
  for (let index = 0; index < pineCount; index += 1) {
    const height = pineHeights[index % pineHeights.length];
    drawLongleafPine(left + 12 + index * 104 + pineOffsets[index % pineOffsets.length], world.ground + 16, height, index % 3 === 1);
  }

  for (let i = 0; i < Math.ceil(span / 18) + 1; i += 1) {
    drawWiregrass(left + 8 + i * 18, world.ground + 14, 22 + ((i * 7) % 6) * 5);
  }

  drawIntroTitle(left);
}

function drawIntroTitle(left) {
  if (activeScene !== 0) return;

  const scale = currentScale();
  const mobileTightness = Math.max(0, Math.min(1, (460 - visibleWorldWidth()) / 180));
  const eased = smoothStep(introWalkProgress(left));
  const titleFade = 1 - smoothStep((eased - 0.74) / 0.22);
  if (titleFade <= 0) return;

  const startX = isIntroScene(activeScene) ? canvas.width / 2 : toScreenX(left + 460);
  const endX = 94 * scale;
  const centerX = startX + (endX - startX) * eased;
  const y = (278 + (44 - 278) * eased) * scale;
  const nameSize = (42 - mobileTightness * 10 - eased * 22) * scale;
  const subSize = (18 - mobileTightness * 3 - eased * 6) * scale;
  const barWidth = (322 - mobileTightness * 76 - eased * 150) * scale;
  const barY = y + (48 - eased * 18) * scale;
  const panelWidth = (430 - mobileTightness * 94 - eased * 230) * scale;
  const panelHeight = (168 - mobileTightness * 18 - eased * 82) * scale;
  const promptAlpha = Math.max(0, 1 - smoothStep((eased - 0.42) / 0.36));

  ctx.save();
  ctx.globalAlpha = titleFade;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(16,18,22,.74)";
  ctx.fillRect(px(centerX - panelWidth / 2), px(y - 56 * scale), px(panelWidth), px(panelHeight));
  ctx.fillStyle = "#f4efe5";
  ctx.font = `${nameSize}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.fillText("Weston Davis", px(centerX), px(y));
  ctx.fillStyle = "#d5d8d6";
  ctx.font = `${subSize}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.fillText("Full-stack GTM builder", px(centerX), px(y + 28 * scale));
  ctx.fillStyle = "#e8c872";
  ctx.fillRect(px(centerX - barWidth / 2), px(barY), px(barWidth), px(6 * scale));
  ctx.fillStyle = "#91d1b4";
  ctx.fillRect(px(centerX - barWidth / 2), px(barY + 10 * scale), px(barWidth * 0.72), px(5 * scale));
  ctx.globalAlpha = titleFade * promptAlpha;
  ctx.fillStyle = "#f4efe5";
  ctx.font = `${12 * scale}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.fillText("walk right to begin", px(centerX), px(barY + 28 * scale));
  ctx.restore();
}

function syncIntroBrand() {
  if (!ui.brand) return;

  if (!isIntroScene(activeScene)) {
    ui.brand.style.opacity = "1";
    ui.brand.style.transform = "translateY(0)";
    ui.brand.style.pointerEvents = "auto";
    return;
  }

  const alpha = smoothStep((introWalkProgress() - 0.68) / 0.24);
  ui.brand.style.opacity = alpha.toFixed(3);
  ui.brand.style.transform = `translateY(${(1 - alpha) * 8}px)`;
  ui.brand.style.pointerEvents = alpha > 0.8 ? "auto" : "none";
}

function shouldShowFinalOverlay() {
  if (finalSceneIndex() < 0) return false;
  const finalTriggerX = lastPlayableSceneIndex() * world.sceneWidth + 620;
  return player.x > finalTriggerX;
}

function syncFinalOverlay() {
  if (!ui.finalOverlay) return;
  const visible = shouldShowFinalOverlay();
  ui.finalOverlay.classList.toggle("is-visible", visible);
  ui.finalOverlay.setAttribute("aria-hidden", String(!visible));
}

function drawPinehurst(left) {
  rectWorld(left, world.ground - 46, world.sceneWidth, 54, "#d7c27e");
  rectWorld(left, world.ground + 4, world.sceneWidth, 16, "#9fcb68");
  const pineHeights = [314, 382, 346, 428, 366, 306, 398, 452];
  const pineOffsets = [0, -8, 11, -5, 15, -10, 8, -3];
  pineHeights.forEach((height, index) => {
    drawLongleafPine(left + 38 + index * 103 + pineOffsets[index], world.ground + 16, height, index % 2 === 0);
  });
  for (let i = 0; i < 48; i += 1) {
    drawWiregrass(left + 22 + i * 19, world.ground + 14, 26 + (i % 5) * 6);
  }
  drawPinehurstPond(left + 470, world.ground + 18);
  drawDragonfly(left + 456, world.ground - 58);
}

function drawSceneForeground(scene, index) {
  const left = index * world.sceneWidth;
  const screenLeft = toScreenX(left);
  const screenRight = toScreenX(left + world.sceneWidth);

  if (screenRight < -80 || screenLeft > canvas.width + 80) return;
  if (scene.visual === "pinehurst") drawTrailSign(left + 230, world.ground - 66, "Pinehurst, NC");
}

function drawLongleafPine(x, ground, height, foreground = false) {
  const trunk = foreground ? "#5f3d27" : "#7a5637";
  const top = ground - height;
  rectWorld(x + 36, top + 70, 12, height - 70, trunk);
  rectWorld(x + 33, top + 124, 7, height - 124, "#8a6543");
  rectWorld(x + 44, top + 92, 5, height - 92, "#3f2619");

  const branches = [
    [-54, 70, 76, -30],
    [12, 62, 88, -36],
    [-44, 112, 70, -24],
    [10, 108, 78, -26],
    [-28, 152, 54, -16],
    [8, 166, 62, -18]
  ];

  branches.forEach(([dx, by, length, rise], index) => {
    drawPineBranch(x + 42, top + by, dx, length, rise, trunk);
    drawNeedleTuft(x + 42 + dx + Math.sign(dx) * length * 0.35, top + by + rise, foreground, index);
  });

  drawNeedleTuft(x + 42, top + 24, foreground, 0, 1.2);
  drawNeedleTuft(x + 18, top + 46, foreground, 1, 0.92);
  drawNeedleTuft(x + 70, top + 50, foreground, 2, 0.96);
}

function drawPineBranch(x, y, direction, length, rise, color) {
  const dir = Math.sign(direction);
  for (let i = 0; i < 5; i += 1) {
    const stepX = dir * (length / 5) * i;
    const stepY = (rise / 5) * i;
    rectWorld(x + stepX, y + stepY, dir * 18, 4, color);
  }
}

function drawNeedleTuft(x, y, foreground, seed, size = 1) {
  const dark = foreground ? "#183f2b" : "#2f6846";
  const mid = foreground ? "#25613d" : "#3d7a50";
  const light = "#5a9b62";
  const s = size;
  const offsets = [
    [0, -18, 8, 36],
    [-18, -8, 36, 8],
    [18, -8, 36, 8],
    [-12, -18, 26, 8],
    [10, -18, 26, 8],
    [-10, 8, 24, 8],
    [8, 8, 24, 8]
  ];
  offsets.forEach(([ox, oy, w, h], i) => {
    rectWorld(x + ox * s, y + oy * s, w * s, h * s, i % 3 === 0 ? dark : i % 3 === 1 ? mid : light);
  });
  rectWorld(x - 3 * s, y - 3 * s, 8 * s, 8 * s, seed % 2 ? "#6a9f63" : "#315d3f");
}

function drawWiregrass(x, ground, height) {
  const blades = [
    [-9, height * 0.7, -9, "#c8b26e"],
    [-5, height * 0.95, -6, "#ddc783"],
    [-1, height, -2, "#9b9c62"],
    [3, height * 0.9, 4, "#d7bd74"],
    [7, height * 0.76, 8, "#b3aa68"],
    [11, height * 0.58, 10, "#e4ce8b"]
  ];

  rectWorld(x - 12, ground - 2, 25, 4, "#8fb15b");
  rectWorld(x - 7, ground - 5, 14, 5, "#a6a267");
  blades.forEach(([offset, bladeHeight, lean, color]) => drawWiregrassBlade(x + offset, ground, bladeHeight, lean, color));
}

function drawWiregrassBlade(x, ground, height, lean, color) {
  const segments = 4;
  for (let i = 0; i < segments; i += 1) {
    const top = i / segments;
    const bottom = (i + 1) / segments;
    const segmentX = x + lean * top;
    const segmentY = ground - height * bottom;
    rectWorld(segmentX, segmentY, 2, height / segments + 1, color);
  }
}

function drawPinehurstPond(x, y) {
  rectWorld(x - 16, y + 2, 238, 24, "#8db46d");
  rectWorld(x - 8, y, 222, 28, "#d4c17d");
  rectWorld(x, y + 2, 210, 23, "#769792");
  rectWorld(x + 8, y + 4, 194, 17, "#94b9b4");
  rectWorld(x + 24, y + 8, 156, 5, "#c1ddd5");
  rectWorld(x + 82, y + 18, 92, 3, "#6f918d");

  drawLilyPad(x + 36, y + 12, 0);
  drawLilyPad(x + 96, y + 17, 1);
  drawLilyPad(x + 154, y + 10, 2);
  drawPondReeds(x + 7, y + 20);
  drawPondReeds(x + 202, y + 21);
}

function drawLilyPad(x, y, variant) {
  const leaf = variant % 2 === 0 ? "#3f8b4e" : "#4fa05a";
  rectWorld(x, y, 16, 5, leaf);
  rectWorld(x + 3, y - 3, 10, 3, leaf);
  rectWorld(x + 10, y + 2, 5, 2, "#94b9b4");
  rectWorld(x + 6, y - 5, 3, 3, variant === 1 ? "#f6d4df" : "#f6e6a2");
}

function drawPondReeds(x, y) {
  rectWorld(x, y - 12, 2, 14, "#6f8d51");
  rectWorld(x + 5, y - 18, 2, 20, "#8ca75d");
  rectWorld(x + 10, y - 10, 2, 12, "#587a45");
  rectWorld(x + 4, y - 20, 4, 3, "#9b6e3c");
}

function drawDragonfly(x, y) {
  const progress = (performance.now() * 0.00008) % 1;
  const wingBeat = Math.floor(performance.now() / 180) % 2;
  const flyX = x + progress * 238;
  const flyY = y + Math.sin(progress * Math.PI * 4) * 7;
  const wingA = wingBeat ? "#d9eef0" : "#c1ddd5";
  const wingB = wingBeat ? "#c1ddd5" : "#d9eef0";

  rectWorld(flyX + 6, flyY + 5, 26, 3, "#24513e");
  rectWorld(flyX + 30, flyY + 4, 5, 5, "#183f2b");
  rectWorld(flyX + 4, flyY + 4, 4, 5, "#54aba1");
  rectWorld(flyX + 12, flyY + 2, 5, 2, "#8bdc65");
  rectWorld(flyX + 18, flyY + 2, 5, 2, "#8bdc65");
  rectWorld(flyX + 10, flyY - 4, 16, 4, wingA);
  rectWorld(flyX + 12, flyY + 9, 16, 4, wingB);
  rectWorld(flyX + 21, flyY - 7, 14, 4, wingB);
  rectWorld(flyX + 22, flyY + 12, 14, 4, wingA);
  rectWorld(flyX + 34, flyY + 5, 2, 2, "#f4efe5");
}

function drawWorkshop(x, y) {
  rectWorld(x, y + 42, 140, 52, "#8f6f43");
  rectWorld(x + 18, y + 18, 104, 26, "#6b4931");
  rectWorld(x + 28, y + 62, 36, 32, "#26313a");
  rectWorld(x + 86, y + 58, 28, 12, "#e8c872");
}

function drawTrailSign(x, y, label) {
  const isPinehurst = label === "Pinehurst, NC";
  const width = isPinehurst ? 148 : 96;
  const height = isPinehurst ? 42 : 38;
  rectWorld(x + width * 0.46, y + height - 2, 12, 74, "#5e3b24");
  rectWorld(x + width * 0.46 + 3, y + height, 5, 70, "#93633d");
  rectWorld(x - 5, y + 5, width + 10, height - 2, "#5e3b24");
  rectWorld(x, y, width, height, "#caa66b");
  rectWorld(x + 6, y + 6, width - 12, height - 12, "#e4c785");
  rectWorld(x + 12, y + 11, width - 24, 4, "rgba(255,255,255,.22)");
  rectWorld(x + 10, y + height - 10, width - 20, 4, "rgba(67,42,25,.2)");

  if (isPinehurst) {
    drawRusticLetters(label, x + 18, y + 10, "#2e2619");
  } else {
    text(label, toScreenX(x + 23), toScreenY(y + 25), 13 * currentScale(), "#29251a");
  }
}

function drawRusticLetters(label, x, y, color) {
  const scale = currentScale();
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${18 * scale}px "Tiny5", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.fillText(label, px(toScreenX(x + 56)), px(toScreenY(y + 20)));
  ctx.fillRect(px(toScreenX(x + 4)), px(toScreenY(y + 24)), px(104 * scale), px(2 * scale));
  ctx.restore();
}

function drawTulane(left) {
  rectWorld(left, world.ground - 48, world.sceneWidth, 56, "#d9c887");
  drawUptownHouseA(left + 54, world.ground - 188);
  drawUptownHouseB(left + 706, world.ground - 178);
  drawGibsonHall(left + 354, world.ground - 194);
  drawLiveOak(left + 28, world.ground + 12, 1.1);
  drawLiveOak(left + 742, world.ground + 14, 0.98);
  drawStreetcarLine(left);
  ctx.save();
  ctx.beginPath();
  const clipX = px(toScreenX(left));
  ctx.rect(clipX, 0, Math.max(0, canvas.width - clipX + 400), canvas.height);
  ctx.clip();
  drawStreetcar(left + 866 - ((performance.now() * 0.00006) % 1) * 1130, world.ground - 88);
  ctx.restore();
}

function drawGibsonHall(x, y) {
  const stone = "#e8e0cc";
  const shadow = "#b7ad96";
  const roof = "#8fa1a3";
  const dark = "#26313a";

  rectWorld(x, y + 74, 330, 112, stone);
  rectWorld(x + 18, y + 44, 294, 34, stone);
  rectWorld(x + 112, y + 16, 106, 62, stone);
  drawPixelGable(x + 104, y - 34, 124, 54, roof, stone);
  rectWorld(x + 130, y + 14, 70, 7, "#7b5d42");

  drawGibsonTower(x - 8, y + 34, false);
  drawGibsonTower(x + 284, y + 34, true);
  rectWorld(x + 34, y + 28, 82, 24, roof);
  rectWorld(x + 214, y + 28, 82, 24, roof);
  rectWorld(x + 42, y + 48, 66, 10, "#5d747a");
  rectWorld(x + 222, y + 48, 66, 10, "#5d747a");
  rectWorld(x + 6, y + 68, 318, 8, shadow);
  rectWorld(x + 12, y + 112, 306, 6, shadow);
  rectWorld(x + 10, y + 184, 310, 8, shadow);

  for (let i = 0; i < 11; i += 1) {
    rectWorld(x + 14 + i * 28, y + 86, 14, 3, "#c7bea9");
    rectWorld(x + 18 + i * 28, y + 124, 10, 3, "#c7bea9");
    rectWorld(x + 16 + i * 28, y + 158, 12, 3, "#c7bea9");
  }

  for (let i = 0; i < 6; i += 1) {
    drawArchedWindow(x + 36 + i * 43, y + 94, 23, 44);
    drawArchedWindow(x + 36 + i * 43, y + 142, 23, 36);
  }

  drawArchedWindow(x + 124, y + 42, 19, 30);
  drawArchedWindow(x + 150, y + 42, 19, 30);
  drawArchedWindow(x + 176, y + 42, 19, 30);
  rectWorld(x + 134, y + 146, 54, 40, dark);
  rectWorld(x + 152, y + 154, 12, 32, "#f4efe5");
  rectWorld(x + 126, y + 138, 70, 8, shadow);
  rectWorld(x + 116, y + 186, 88, 8, "#d8d0bf");
}

function drawPixelGable(x, y, width, height, roof, stone) {
  const steps = 8;
  for (let i = 0; i < steps; i += 1) {
    const inset = (steps - 1 - i) * (width / (steps * 2));
    const rowY = y + i * (height / steps);
    rectWorld(x + inset, rowY, width - inset * 2, height / steps + 2, roof);
  }
  for (let i = 2; i < steps; i += 1) {
    const inset = (steps - 1 - i) * (width / (steps * 2)) + 4;
    const rowY = y + i * (height / steps) + 1;
    rectWorld(x + inset, rowY, width - inset * 2 - 8, height / steps + 1, stone);
  }
  rectWorld(x + width / 2 - 8, y + height - 18, 16, 16, "#26313a");
  rectWorld(x + width / 2 - 1, y + height - 16, 2, 14, "#f4efe5");
}

function drawStreetcar(x, y) {
  rectWorld(x - 6, y + 16, 316, 72, "#16271d");
  rectWorld(x, y + 2, 304, 82, "#5f6443");
  rectWorld(x + 8, y - 8, 288, 18, "#9a9980");
  rectWorld(x + 16, y - 15, 272, 10, "#31543a");
  rectWorld(x + 2, y + 13, 300, 8, "#7a2e2d");
  rectWorld(x + 26, y + 24, 44, 52, "#7a2e2d");
  rectWorld(x + 238, y + 24, 42, 52, "#7a2e2d");
  for (let i = 0; i < 7; i += 1) {
    const wx = x + 76 + i * 24;
    rectWorld(wx, y + 24, 18, 28, "#7a2e2d");
    rectWorld(wx + 3, y + 27, 12, 20, "#cfe8e3");
  }
  rectWorld(x + 32, y + 31, 12, 38, "#26313a");
  rectWorld(x + 52, y + 31, 10, 38, "#26313a");
  rectWorld(x + 244, y + 31, 12, 38, "#26313a");
  rectWorld(x + 264, y + 31, 10, 38, "#26313a");
  rectWorld(x + 92, y + 56, 104, 18, "#e5dfc3");
  rectWorld(x + 104, y + 62, 82, 5, "#b7ad96");
  rectWorld(x + 10, y + 72, 284, 12, "#2b2e25");
  for (let i = 0; i < 4; i += 1) {
    rectWorld(x + 52 + i * 62, y + 88, 30, 8, "#252525");
    rectWorld(x + 60 + i * 62, y + 82, 14, 16, "#4a4a46");
  }
  rectWorld(x + 144, y - 44, 3, 38, "#31543a");
  rectWorld(x + 148, y - 44, 76, 3, "#31543a");
}

function drawStreetcarLine(left) {
  rectWorld(left + 54, world.ground + 8, 812, 5, "#415952");
  rectWorld(left + 54, world.ground + 21, 812, 4, "#5f6a5f");
  for (let i = 0; i < 28; i += 1) {
    rectWorld(left + 68 + i * 29, world.ground + 10, 14, 20, "#8b7a55");
  }
}

function drawLiveOak(x, ground, size) {
  const s = size;
  rectWorld(x + 68 * s, ground - 170 * s, 42 * s, 170 * s, "#5f432d");
  rectWorld(x + 82 * s, ground - 162 * s, 12 * s, 162 * s, "#8a6543");
  rectWorld(x + 56 * s, ground - 26 * s, 66 * s, 26 * s, "#4c3526");
  rectWorld(x + 34 * s, ground - 10 * s, 54 * s, 10 * s, "#4c3526");
  rectWorld(x + 104 * s, ground - 10 * s, 58 * s, 10 * s, "#4c3526");
  rectWorld(x + 66 * s, ground - 136 * s, 28 * s, 126 * s, "#4b3425");
  rectWorld(x + 76 * s, ground - 154 * s, 24 * s, 142 * s, "#7a5637");

  drawLiveOakLimb(x + 98 * s, ground - 168 * s, 1, [[28, -12], [34, -6], [38, -18], [26, 6]], s);
  drawLiveOakLimb(x + 72 * s, ground - 158 * s, -1, [[34, -8], [28, 10], [42, -20], [30, 8]], s);
  drawLiveOakLimb(x + 104 * s, ground - 124 * s, 1, [[24, 8], [36, -4], [28, 14]], s);
  drawLiveOakLimb(x + 62 * s, ground - 118 * s, -1, [[26, 10], [30, -6], [24, 12]], s);

  drawOakLeafCluster(x - 70 * s, ground - 236 * s, 136 * s, 66 * s, "#214e34");
  drawOakLeafCluster(x + 12 * s, ground - 276 * s, 154 * s, 76 * s, "#2d6040");
  drawOakLeafCluster(x + 118 * s, ground - 252 * s, 154 * s, 70 * s, "#356b44");
  drawOakLeafCluster(x - 34 * s, ground - 202 * s, 136 * s, 58 * s, "#17442e");
  drawOakLeafCluster(x + 86 * s, ground - 204 * s, 154 * s, 58 * s, "#2f6846");
  drawOakLeafCluster(x + 42 * s, ground - 302 * s, 108 * s, 46 * s, "#4b8b55");
  drawOakLeafCluster(x - 4 * s, ground - 250 * s, 62 * s, 42 * s, "#407c4e");
  drawOakLeafCluster(x + 174 * s, ground - 224 * s, 66 * s, 44 * s, "#3d774c");
  drawOakLeafCluster(x - 54 * s, ground - 162 * s, 72 * s, 38 * s, "#214e34");
  drawOakLeafCluster(x + 154 * s, ground - 168 * s, 82 * s, 40 * s, "#2f6846");
  drawOakLeafCluster(x - 28 * s, ground - 134 * s, 62 * s, 34 * s, "#2d6040");
  drawOakLeafCluster(x + 132 * s, ground - 130 * s, 70 * s, 34 * s, "#356b44");

  for (let i = 0; i < 12; i += 1) {
    const mossX = x + (-18 + i * 23) * s;
    const mossY = ground - (194 + (i % 4) * 13) * s;
    drawMoss(mossX, mossY, s, 28 + (i % 3) * 12);
    if (i % 3 === 1) drawHangingBeads(mossX + 5 * s, mossY + 8 * s, s);
  }
}

function drawLiveOakLimb(x, y, direction, segments, size) {
  let currentX = x;
  let currentY = y;
  segments.forEach(([length, rise], index) => {
    const thickness = Math.max(7 * size, (18 - index * 3) * size);
    const stepCount = 3;
    for (let i = 0; i < stepCount; i += 1) {
      const t = i / stepCount;
      const segmentX = currentX + direction * length * t;
      const segmentY = currentY + rise * t;
      rectWorld(segmentX, segmentY, direction * (length / stepCount + 7 * size), thickness, index % 2 === 0 ? "#4c3526" : "#5f432d");
    }
    currentX += direction * length;
    currentY += rise;
  });
}

function drawMoss(x, y, size, length) {
  const s = size;
  rectWorld(x, y, 3 * s, length * s, "#7b8061");
  rectWorld(x + 5 * s, y + 8 * s, 2 * s, (length * 0.66) * s, "#9a9b76");
  rectWorld(x - 5 * s, y + 15 * s, 2 * s, (length * 0.48) * s, "#646c53");
}

function drawHangingBeads(x, y, size) {
  const colors = ["#6b47b8", "#2f9f5a", "#d8b238"];
  const strands = [
    [0, 0, 8],
    [12, 8, 6],
    [-10, 14, 5]
  ];
  strands.forEach(([dx, dy, count], strandIndex) => {
    for (let i = 0; i < count; i += 1) {
      const swing = Math.sin(i * 0.9 + strandIndex) * 2 * size;
      rectWorld(x + dx * size + swing, y + dy * size + i * 5 * size, 4 * size, 4 * size, colors[(i + strandIndex) % colors.length]);
    }
  });
}

function drawGibsonTower(x, y, rightSide) {
  rectWorld(x, y + 32, 52, 120, "#e8e0cc");
  rectWorld(x + 6, y + 12, 40, 24, "#d9d1bf");
  rectWorld(x + 12, y, 28, 14, "#78949a");
  rectWorld(x + (rightSide ? 34 : 4), y - 16, 12, 18, "#78949a");
  drawArchedWindow(x + 14, y + 44, 21, 36);
  drawArchedWindow(x + 14, y + 88, 21, 34);
}

function drawMiniTulaneLogo(p) {
  p(-3, -18, 5, 1, "#24513e");
  p(-1, -18, 1, 4, "#24513e");
}

function drawUptownHouseA(x, y) {
  rectWorld(x, y + 54, 204, 132, "#f4f0e4");
  rectWorld(x - 10, y + 38, 224, 24, "#d6d0c0");
  rectWorld(x + 20, y + 18, 164, 26, "#f8f6ed");
  rectWorld(x + 72, y - 6, 62, 28, "#d6d0c0");
  rectWorld(x + 88, y - 18, 30, 14, "#f4f0e4");
  rectWorld(x + 18, y + 86, 170, 10, "#d6d0c0");
  rectWorld(x + 18, y + 112, 170, 10, "#d6d0c0");
  for (let i = 0; i < 5; i += 1) {
    rectWorld(x + 32 + i * 34, y + 62, 8, 118, "#f8f6ed");
    rectWorld(x + 34 + i * 34, y + 64, 4, 116, "#c8c2b2");
  }
  drawArchedWindow(x + 42, y + 76, 28, 44);
  drawArchedWindow(x + 134, y + 76, 28, 44);
  rectWorld(x + 86, y + 128, 34, 58, "#2d3b43");
  drawIronFence(x - 14, y + 174, 236);
}

function drawUptownHouseB(x, y) {
  rectWorld(x, y + 60, 190, 124, "#e7ded0");
  rectWorld(x - 10, y + 36, 210, 30, "#cfc3ae");
  rectWorld(x + 8, y + 16, 174, 22, "#e7ded0");
  rectWorld(x + 24, y - 2, 142, 20, "#cfc3ae");
  rectWorld(x + 34, y + 88, 126, 12, "#f0eadc");
  for (let i = 0; i < 4; i += 1) {
    rectWorld(x + 34 + i * 38, y + 62, 9, 118, "#f6f1e7");
    rectWorld(x + 36 + i * 38, y + 64, 4, 116, "#beb39f");
  }
  drawArchedWindow(x + 48, y + 68, 28, 44);
  drawArchedWindow(x + 116, y + 68, 28, 44);
  rectWorld(x + 82, y + 124, 32, 60, "#432f27");
  drawIronFence(x - 12, y + 174, 214);
}

function drawIronFence(x, y, width) {
  rectWorld(x, y + 20, width, 4, "#1f2425");
  for (let i = 0; i < width / 10; i += 1) {
    rectWorld(x + i * 10, y, 3, 32, "#1f2425");
    rectWorld(x + i * 10 - 1, y - 3, 5, 4, "#1f2425");
  }
}

function drawArchedWindow(x, y, w, h) {
  rectWorld(x, y + 10, w, h - 10, "#f4efe5");
  rectWorld(x + 4, y + 5, w - 8, 12, "#f4efe5");
  rectWorld(x + 4, y + 14, w - 8, h - 18, "#26313a");
  rectWorld(x + w / 2 - 1, y + 16, 2, h - 20, "#f4efe5");
}

function drawLaw(left) {
  const groundLine = world.ground + 8;
  drawRaleighSkyline(left + 330, groundLine - 236);
  drawCapitolOak(left + 18, groundLine, 0.94, true);
  drawCapitolOak(left + 696, groundLine, 0.82, false);
  drawRaleighCapitol(left + 250, groundLine - 226);
}

function drawRaleighSkyline(x, y) {
  const glass = "#b9d2dc";
  const blue = "#8faebd";
  const shadow = "#6f94a4";
  rectWorld(x - 162, y + 128, 64, 112, "#d1e2e8");
  rectWorld(x - 148, y + 116, 36, 12, "#9fbcca");
  rectWorld(x - 60, y + 70, 68, 170, glass);
  rectWorld(x - 46, y + 52, 40, 18, blue);
  rectWorld(x + 34, y + 26, 74, 214, "#a9c7d3");
  rectWorld(x + 54, y + 8, 34, 18, "#c8dce4");
  rectWorld(x + 124, y + 94, 58, 146, "#d1e2e8");
  rectWorld(x + 206, y + 52, 78, 188, "#aecbd7");
  rectWorld(x + 298, y + 118, 96, 122, "#ccdde4");
  rectWorld(x + 416, y + 86, 112, 154, "#b8d0db");
  for (let row = 0; row < 7; row += 1) {
    rectWorld(x - 44, y + 92 + row * 20, 38, 5, shadow);
    rectWorld(x + 52, y + 50 + row * 24, 42, 5, "#e8c872");
    rectWorld(x + 224, y + 78 + row * 22, 42, 5, shadow);
    rectWorld(x + 438, y + 112 + row * 18, 58, 4, "#8fb0bc");
  }
  rectWorld(x - 182, y + 236, 760, 4, "#8fb3c0");
}

function drawRaleighCapitol(x, y) {
  const stone = "#e5dcc8";
  const warm = "#d1c3a7";
  const shadow = "#a89b82";
  const dark = "#2d3a44";

  rectWorld(x + 20, y + 112, 400, 116, stone);
  rectWorld(x + 62, y + 74, 316, 58, "#ded3bd");
  rectWorld(x + 122, y + 26, 196, 70, stone);
  drawTrianglePediment(x + 118, y - 12, 204, 48, warm, stone);
  rectWorld(x + 102, y + 92, 236, 12, shadow);
  rectWorld(x + 84, y + 132, 274, 10, shadow);
  rectWorld(x + 48, y + 218, 344, 14, "#d7cab2");
  rectWorld(x + 76, y + 230, 288, 14, "#c7b99f");
  rectWorld(x + 114, y + 242, 212, 12, "#b9aa91");

  for (let i = 0; i < 6; i += 1) {
    const colX = x + 102 + i * 42;
    rectWorld(colX, y + 112, 16, 106, "#f0e8d7");
    rectWorld(colX + 4, y + 112, 8, 106, "#cdbfA7");
    rectWorld(colX - 4, y + 102, 24, 10, warm);
    rectWorld(colX - 4, y + 214, 24, 8, shadow);
  }

  for (let i = 0; i < 4; i += 1) {
    if (i === 2) continue;
    drawCapitolWindow(x + 42 + i * 86, y + 150, dark);
  }
  drawCapitolWindow(x + 146, y + 54, dark);
  drawCapitolWindow(x + 236, y + 54, dark);
  rectWorld(x + 198, y + 166, 44, 62, dark);
  rectWorld(x + 216, y + 166, 8, 62, "#f4efe5");
  rectWorld(x + 182, y + 228, 76, 18, "#e9dfc9");
  drawLampPost(x + 52, y + 132);
  drawLampPost(x + 360, y + 132);
}

function drawTrianglePediment(x, y, width, height, trim, fill) {
  const steps = 8;
  for (let i = 0; i < steps; i += 1) {
    const inset = (steps - 1 - i) * (width / (steps * 2));
    const rowHeight = height / steps + 1;
    rectWorld(x + inset, y + i * rowHeight, width - inset * 2, rowHeight, trim);
  }
  for (let i = 2; i < steps; i += 1) {
    const inset = (steps - 1 - i) * (width / (steps * 2)) + 8;
    const rowHeight = height / steps + 1;
    rectWorld(x + inset, y + i * rowHeight, width - inset * 2, rowHeight, fill);
  }
}

function drawCapitolWindow(x, y, dark) {
  rectWorld(x, y, 24, 48, "#f4efe5");
  rectWorld(x + 5, y + 6, 14, 36, dark);
  rectWorld(x + 11, y + 6, 2, 36, "#f4efe5");
}

function drawLampPost(x, y) {
  const flicker = Math.floor(performance.now() / 130 + x * 0.17) % 4;
  const flame = flicker === 0 ? "#fff4bd" : flicker === 1 ? "#f8c537" : flicker === 2 ? "#f08a32" : "#ffe08a";
  const glow = flicker % 2 === 0 ? "rgba(248,197,55,.22)" : "rgba(248,138,50,.16)";
  rectWorld(x + 14, y + 26, 4, 82, "#2f4b47");
  rectWorld(x, y + 18, 32, 6, "#2f4b47");
  rectWorld(x + 1, y + 4, 30, 24, glow);
  rectWorld(x + 4, y + 6, 10, 16, "#f5e7af");
  rectWorld(x + 20, y + 6, 10, 16, "#f5e7af");
  rectWorld(x + 7, y + 10 + (flicker % 2), 4, 8 - (flicker === 2 ? 2 : 0), flame);
  rectWorld(x + 23, y + 10 + (flicker === 1 ? 1 : 0), 4, 8 - (flicker === 3 ? 2 : 0), flame);
  rectWorld(x + 8, y + 15, 2, 3, "#7b4a22");
  rectWorld(x + 24, y + 15, 2, 3, "#7b4a22");
  rectWorld(x + 6, y + 4, 6, 4, "#2f4b47");
  rectWorld(x + 22, y + 4, 6, 4, "#2f4b47");
}

function drawCapitolOak(x, ground, size, leftSide) {
  const s = size;
  const trunkX = x + 92 * s;
  rectWorld(trunkX - 4 * s, ground - 172 * s, 36 * s, 172 * s, "#6b4328");
  rectWorld(trunkX + 7 * s, ground - 166 * s, 10 * s, 166 * s, "#8a5a32");
  rectWorld(trunkX - 18 * s, ground - 12 * s, 68 * s, 12 * s, "#4f321f");
  rectWorld(trunkX - 28 * s, ground - 5 * s, 38 * s, 5 * s, "#4f321f");
  rectWorld(trunkX + 22 * s, ground - 5 * s, 46 * s, 5 * s, "#4f321f");

  rectWorld(trunkX - 22 * s, ground - 152 * s, 36 * s, 16 * s, "#4f321f");
  rectWorld(trunkX + 18 * s, ground - 144 * s, 42 * s, 16 * s, "#5d3b26");
  rectWorld(trunkX - 34 * s, ground - 126 * s, 30 * s, 14 * s, "#5d3b26");
  rectWorld(trunkX + 30 * s, ground - 118 * s, 34 * s, 14 * s, "#4f321f");

  drawOakLeafCluster(x - 42 * s, ground - 260 * s, 88 * s, 64 * s, "#17442e");
  drawOakLeafCluster(x + 16 * s, ground - 294 * s, 112 * s, 78 * s, "#2d6f42");
  drawOakLeafCluster(x + 100 * s, ground - 282 * s, 128 * s, 76 * s, "#3d7d4e");
  drawOakLeafCluster(x - 8 * s, ground - 226 * s, 120 * s, 64 * s, "#245d39");
  drawOakLeafCluster(x + 90 * s, ground - 220 * s, 142 * s, 64 * s, "#2f6846");
  drawOakLeafCluster(x + 38 * s, ground - 316 * s, 92 * s, 44 * s, "#5a9b62");
  drawOakLeafCluster(x + 118 * s, ground - 252 * s, 54 * s, 42 * s, "#1f4c34");
  drawOakLeafCluster(x - 30 * s, ground - 164 * s, 78 * s, 38 * s, "#17442e");
  drawOakLeafCluster(x + 142 * s, ground - 158 * s, 82 * s, 38 * s, "#245d39");
  drawOakLeafCluster(x + 24 * s, ground - 142 * s, 64 * s, 34 * s, "#2d6f42");
  drawOakLeafCluster(x + 116 * s, ground - 136 * s, 66 * s, 34 * s, "#356b44");
}

function drawOakLeafCluster(x, y, w, h, color) {
  rectWorld(x + w * 0.12, y, w * 0.76, h * 0.2, color);
  rectWorld(x, y + h * 0.18, w, h * 0.52, color);
  rectWorld(x + w * 0.12, y + h * 0.66, w * 0.76, h * 0.24, color);
  rectWorld(x + w * 0.24, y + h * 0.9, w * 0.5, h * 0.1, color);
}

function drawCommercialSystemsMarker(x, y) {
  rectWorld(x, y + 62, 210, 20, "#d1b177");
  rectWorld(x + 12, y + 40, 186, 26, "#f4e2af");
  rectWorld(x + 22, y + 50, 142, 5, "#6d6558");
  rectWorld(x + 36, y + 4, 52, 38, "#efe4c8");
  rectWorld(x + 44, y + 16, 36, 5, "#233447");
  rectWorld(x + 44, y + 27, 28, 5, "#6d6558");
  rectWorld(x + 110, y - 6, 58, 48, "#e7d3a2");
  rectWorld(x + 120, y + 8, 38, 5, "#233447");
  rectWorld(x + 120, y + 22, 30, 5, "#6d6558");
  text("IP", toScreenX(x + 172), toScreenY(y + 31), 15 * currentScale(), "#243447");
  text("Licensing", toScreenX(x + 52), toScreenY(y - 10), 15 * currentScale(), "#243447");
}

function drawRedHat(left) {
  const groundLine = world.ground + 8;
  drawTower(left + 68, groundLine - 320, 250, 320, "#24313a", "#c92828", "redhat");
  drawDukeEnergyTower(left + 344, groundLine - 250, 168, 250);
  drawTerminal(left + 556, groundLine - 206, "OpenShift", "> oc apply -f gtm.yaml");
}

function drawTower(x, y, w, h, body, cap, label) {
  rectWorld(x - 8, y + 32, w + 16, h - 32, "#151b22");
  rectWorld(x, y + 40, w, h - 40, body);
  rectWorld(x - 10, y + 34, w + 20, 8, "#10151b");
  rectWorld(x - 16, y + 44, w + 32, 6, "#3e4b53");
  rectWorld(x + 10, y + 52, w - 20, h - 68, "#1d3f46");

  for (let row = 0; row < 9; row += 1) {
    const floorY = y + 58 + row * 26;
    rectWorld(x + 4, floorY - 5, w - 8, 4, "#6f7e86");
    rectWorld(x + 4, floorY + 17, w - 8, 3, "#0f262c");
    for (let col = 0; col < 8; col += 1) {
      const winX = x + 18 + col * 27;
      const flickerWindow = (row === 1 && col === 6) || (row === 3 && col === 2) || (row === 5 && col === 5) || (row === 7 && col === 1);
      const flickerOn = Math.floor(performance.now() / 520 + row * 3 + col * 5) % 5 !== 0;
      const lit = flickerWindow ? flickerOn : (row + col) % 4 === 0;
      rectWorld(winX, floorY, 19, 15, lit ? "#f0d58b" : "#2d7c80");
      rectWorld(winX + 2, floorY + 2, 15, 3, lit ? "#fff0bd" : "#5aa1a5");
      rectWorld(winX + 8, floorY, 2, 15, "#7e9198");
    }
  }

  rectWorld(x + 26, y, w - 52, 34, cap);
  rectWorld(x + 26, y + 28, w - 52, 6, "#8c1719");
  rectWorld(x + 48, y + 9, 18, 18, "#111318");
  rectWorld(x + 51, y + 11, 12, 10, "#d62b2d");
  rectWorld(x + 50, y + 20, 14, 4, "#f4efe5");
  rectWorld(x + 72, y + 23, 58, 4, "#fff3df");
  text(label, toScreenX(x + 74), toScreenY(y + 22), 16 * currentScale(), "#fff3df");
  rectWorld(x + w - 26, y - 8, 24, 42, "#b8c2c7");
}

function drawHighRise(x, y, w, h, color) {
  rectWorld(x, y, w, h, color);
  rectWorld(x - 8, y + h - 10, w + 16, 10, "#242b33");
  rectWorld(x, y + 8, w, 6, "#59636f");
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      rectWorld(x + 22 + col * 40, y + 26 + row * 24, 20, 11, "#9fb6c9");
      rectWorld(x + 22 + col * 40, y + 26 + row * 24, 20, 2, "#d4e1e8");
    }
  }
}

function drawDukeEnergyTower(x, y, w, h) {
  rectWorld(x, y + 12, w, h - 12, "#eef1ee");
  rectWorld(x + 8, y, w - 22, 14, "#f7f8f5");
  rectWorld(x + w - 16, y + 12, 18, h - 12, "#d5dad8");
  rectWorld(x + w - 4, y + 24, 8, h - 24, "#f7f8f5");
  rectWorld(x - 6, y + h - 10, w + 14, 10, "#c9cfca");

  for (let col = 0; col < 5; col += 1) {
    const gx = x + 14 + col * 28;
    rectWorld(gx, y + 32, 18, h - 52, "#162631");
    rectWorld(gx + 14, y + 32, 3, h - 52, "#3c515b");
    for (let row = 0; row < 8; row += 1) {
      const gy = y + 38 + row * 24;
      rectWorld(gx + 2, gy, 13, 2, row % 3 === 0 ? "#d9c78a" : "#536a73");
      rectWorld(gx + 2, gy + 10, 13, 2, "#334851");
    }
  }

  for (let col = 0; col < 6; col += 1) {
    rectWorld(x + 8 + col * 26, y + 18, 4, h - 26, "#f9fbf7");
  }
}

function drawTerminal(x, y, label, command) {
  rectWorld(x, y, 302, 130, "#10151b");
  rectWorld(x, y, 302, 28, "#232a34");
  text(label, toScreenX(x + 20), toScreenY(y + 66), 22 * currentScale(), "#d8f77a");
  text(command, toScreenX(x + 20), toScreenY(y + 101), 15 * currentScale(), "#8bdc65");
}

function drawHandshake(x, y, size = 1) {
  const s = size;
  rectWorld(x, y + 38 * s, 128 * s, 16 * s, "#7f5b3f");
  rectWorld(x + 14 * s, y, 42 * s, 44 * s, "#e7d0b3");
  rectWorld(x + 70 * s, y, 42 * s, 44 * s, "#c99770");
  rectWorld(x + 46 * s, y + 18 * s, 38 * s, 22 * s, "#876447");
}

function drawLiferay(left) {
  const groundLine = world.ground + 8;
  drawCaliforniaSun(left + 748, 42, 56);
  drawHomeOffice(left + 72, groundLine - 190, groundLine);
  drawPalm(left + 430, groundLine + 4, 1.06, -0.42);
  drawPalm(left + 808, groundLine + 4, 1.18, 0.3);
  drawPalm(left + 858, groundLine + 4, 0.98, -0.22);
  drawLiferayOffice(left + 470, groundLine - 138, 300, 138);
}

function drawCaliforniaSun(x, y, radius) {
  drawSunRays(x, y, radius);
  circleWorld(x, y, radius * 1.44, "rgba(246,214,126,.12)");
  circleWorld(x, y, radius * 1.04, "rgba(255,226,139,.22)");
  circleWorld(x, y, radius * 0.68, "rgba(255,238,173,.5)");
  circleWorld(x - radius * 0.14, y - radius * 0.16, radius * 0.28, "rgba(255,248,205,.42)");
  drawSunSparkles(x, y, radius);
}

function drawSunRays(x, y, radius) {
  const scale = currentScale();
  const spin = performance.now() * 0.00055;
  ctx.save();
  ctx.translate(px(toScreenX(x)), px(toScreenY(y)));
  ctx.fillStyle = "rgba(246,214,126,.32)";
  ctx.rotate(spin);
  for (let i = 0; i < 16; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 16);
    ctx.fillRect(px((radius + 8) * scale), px(-2.5 * scale), px((i % 2 === 0 ? 26 : 18) * scale), px(5 * scale));
    ctx.restore();
  }
  ctx.restore();
}

function drawSunSparkles(x, y, radius) {
  const time = Math.floor(performance.now() / 180);
  const sparkles = [
    [-1.18, -0.28, 0],
    [0.88, -0.72, 2],
    [1.1, 0.34, 4],
    [-0.76, 0.72, 1],
    [0.22, -1.08, 3]
  ];
  sparkles.forEach(([dx, dy, phase], index) => {
    const lit = (time + phase) % 5 < 2;
    const size = lit ? 6 : 3;
    const sx = x + dx * radius;
    const sy = y + dy * radius;
    const color = index % 2 === 0 ? "#fff4bd" : "#f8c537";
    rectWorld(sx - size / 2, sy - 1, size, 2, color);
    rectWorld(sx - 1, sy - size / 2, 2, size, color);
    if (lit) rectWorld(sx - 2, sy - 2, 4, 4, "rgba(255,248,205,.45)");
  });
}

function circleWorld(x, y, radius, color) {
  const rows = Math.max(6, Math.round(radius / 8));
  const rowHeight = (radius * 2) / rows;
  const grid = Math.max(4, Math.round(radius / 10));
  for (let row = 0; row < rows; row += 1) {
    const cy = -radius + rowHeight * (row + 0.5);
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - cy * cy));
    const steppedHalfWidth = Math.max(grid, Math.round(halfWidth / grid) * grid);
    rectWorld(x - steppedHalfWidth, y - radius + row * rowHeight, steppedHalfWidth * 2, rowHeight + 1, color);
  }
}

function drawHomeOffice(x, y, groundLine) {
  rectWorld(x, y, 264, groundLine - y, "#f0e0be");
  drawHomeOutline(x - 54, y - 70, 372, groundLine - y + 70);
  rectWorld(x, groundLine - 8, 264, 8, "#d6c7a6");
  rectWorld(x + 10, groundLine - 46, 244, 6, "rgba(111,85,56,.16)");
  drawHomeBookshelf(x + 18, groundLine - 134);
  drawMountainArt(x + 102, y + 24);
  drawTroutArt(x + 182, y + 27);

  rectWorld(x + 112, groundLine - 82, 116, 12, "#6f5538");
  rectWorld(x + 112, groundLine - 70, 116, 5, "#4e3522");
  rectWorld(x + 124, groundLine - 69, 9, 61, "#5f432d");
  rectWorld(x + 205, groundLine - 69, 9, 61, "#5f432d");
  rectWorld(x + 144, groundLine - 118, 47, 29, "#253342");
  rectWorld(x + 149, groundLine - 113, 37, 18, "#81bcb5");
  rectWorld(x + 160, groundLine - 89, 9, 7, "#253342");
  rectWorld(x + 151, groundLine - 82, 31, 4, "#253342");
  drawKeyboardAndTrackpad(x + 145, groundLine - 91);
  drawOfficePlant(x + 239, groundLine - 8);
  drawOfficePlant(x + 92, groundLine - 8);
}

function drawHomeBookshelf(x, y) {
  rectWorld(x - 3, y - 3, 72, 130, "#5f432d");
  rectWorld(x, y, 66, 124, "#8f6f43");
  rectWorld(x + 6, y + 12, 54, 30, "#4e3522");
  rectWorld(x + 6, y + 52, 54, 30, "#4e3522");
  rectWorld(x + 6, y + 92, 54, 22, "#4e3522");
  rectWorld(x + 6, y + 8, 54, 8, "#6b4931");
  rectWorld(x + 6, y + 46, 54, 7, "#6b4931");
  rectWorld(x + 6, y + 86, 54, 7, "#6b4931");
  rectWorld(x + 6, y + 114, 54, 7, "#6b4931");
  rectWorld(x + 1, y, 5, 124, "#7a5835");
  rectWorld(x + 60, y, 5, 124, "#6b4931");
  rectWorld(x + 4, y + 122, 58, 5, "#5f432d");
  drawBookRow(x + 10, y + 43, [
    ["#27665c", 6, 24],
    ["#d4473f", 5, 27],
    ["#e2c383", 8, 20],
    ["#4d7fc6", 5, 28],
    ["#b8336a", 6, 23],
    ["#54aba1", 5, 26]
  ]);
  drawBookRow(x + 10, y + 83, [
    ["#e8c872", 7, 22],
    ["#7a4f9f", 8, 28],
    ["#2d6657", 7, 24],
    ["#c45f3c", 5, 27],
    ["#f2e3bd", 8, 21]
  ]);
  drawBookRow(x + 10, y + 113, [
    ["#7a4f9f", 7, 20],
    ["#54aba1", 6, 26],
    ["#e2c383", 8, 24],
    ["#b8336a", 5, 18],
    ["#4d7fc6", 7, 22]
  ]);
}

function drawBookRow(x, y, books) {
  let offset = 0;
  books.forEach(([color, width, height], index) => {
    const bookX = x + offset;
    rectWorld(bookX, y - height, width, height, color);
    rectWorld(bookX + 1, y - height + 3, 2, Math.max(4, height - 6), "rgba(255,255,255,.18)");
    if (index % 2 === 0) rectWorld(bookX, y - 8, width, 3, "#d1b177");
    offset += width + 3;
  });
}

function drawMountainArt(x, y) {
  rectWorld(x, y, 68, 46, "#f4e2af");
  rectWorld(x + 6, y + 6, 56, 34, "#d9eef0");
  rectWorld(x + 6, y + 27, 56, 13, "#91d1b4");
  drawPixelMountain(x + 10, y + 29, 25, 20, "#6f8d9c", "#f4efe5");
  drawPixelMountain(x + 30, y + 30, 28, 22, "#587a8a", "#f4efe5");
  rectWorld(x + 6, y + 40, 56, 4, "#d1b177");
}

function drawTroutArt(x, y) {
  rectWorld(x, y, 58, 38, "#f4e2af");
  rectWorld(x + 5, y + 5, 48, 28, "#d9eef0");
  rectWorld(x + 5, y + 24, 48, 9, "#91d1b4");
  rectWorld(x + 8, y + 30, 42, 3, "#d1b177");

  rectWorld(x + 15, y + 16, 26, 8, "#6f8d9c");
  rectWorld(x + 19, y + 13, 18, 4, "#8fb0bc");
  rectWorld(x + 39, y + 17, 7, 5, "#587a8a");
  rectWorld(x + 9, y + 17, 8, 5, "#587a8a");
  rectWorld(x + 8, y + 15, 5, 3, "#6f8d9c");
  rectWorld(x + 22, y + 19, 15, 2, "#e17a8d");
  rectWorld(x + 42, y + 16, 5, 3, "#6f8d9c");
  rectWorld(x + 30, y + 12, 9, 3, "#587a8a");
  rectWorld(x + 24, y + 24, 10, 3, "#587a8a");
  rectWorld(x + 14, y + 18, 2, 2, "#26313a");
  rectWorld(x + 22, y + 15, 2, 2, "#26313a");
  rectWorld(x + 31, y + 15, 2, 2, "#26313a");
  rectWorld(x + 36, y + 18, 2, 2, "#26313a");
}

function drawKeyboardAndTrackpad(x, y) {
  rectWorld(x, y + 8, 46, 5, "#d8e7e9");
  rectWorld(x + 5, y + 10, 36, 2, "#8fb0bc");
  rectWorld(x + 54, y + 8, 17, 5, "#d8e7e9");
  rectWorld(x + 58, y + 10, 9, 2, "#8fb0bc");
}

function drawPixelMountain(x, baseY, width, height, color, snow) {
  const steps = 5;
  for (let i = 0; i < steps; i += 1) {
    const rowY = baseY - height + i * (height / steps);
    const inset = (steps - 1 - i) * (width / (steps * 2));
    rectWorld(x + inset, rowY, width - inset * 2, height / steps + 1, color);
  }
  rectWorld(x + width * 0.42, baseY - height + 4, width * 0.16, 5, snow);
}

function drawHomeOutline(x, y, width, height) {
  const color = "rgba(84,171,161,.14)";
  const trim = "rgba(84,171,161,.2)";
  const bodyTop = y + 58;
  const bodyBottom = y + height - 6;
  const leftWall = x + 36;
  const rightWall = x + width - 36;
  const peakX = x + width * 0.52;
  const peakY = y + 18;
  const eaveY = bodyTop;

  rectWorld(leftWall, bodyTop, 5, bodyBottom - bodyTop, color);
  rectWorld(rightWall, bodyTop, 5, bodyBottom - bodyTop, color);
  rectWorld(leftWall, bodyBottom, rightWall - leftWall + 5, 5, color);
  drawSteppedLine(leftWall - 34, eaveY, peakX, peakY, color, 5);
  drawSteppedLine(peakX, peakY, rightWall + 34, eaveY, color, 5);
  rectWorld(leftWall - 38, eaveY, 44, 5, color);
  rectWorld(rightWall - 4, eaveY, 44, 5, color);
  drawSlopedChimney(rightWall - 38, y + 16, 28, peakX, peakY, rightWall + 34, eaveY, color, trim);
}

function drawSteppedLine(x1, y1, x2, y2, color, thickness) {
  const steps = 18;
  for (let i = 0; i < steps; i += 1) {
    const t = i / steps;
    const next = (i + 1) / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const nextX = x1 + (x2 - x1) * next;
    const nextY = y1 + (y2 - y1) * next;
    rectWorld(x, y, Math.max(thickness, Math.abs(nextX - x) + thickness), thickness, color);
    rectWorld(nextX, Math.min(y, nextY), thickness, Math.abs(nextY - y) + thickness, color);
  }
}

function drawSlopedChimney(x, top, width, roofX1, roofY1, roofX2, roofY2, color, trim) {
  const slope = (roofY2 - roofY1) / (roofX2 - roofX1);
  for (let column = 0; column < width; column += 4) {
    const columnX = x + column;
    const roofY = roofY1 + (columnX + 2 - roofX1) * slope;
    rectWorld(columnX, top + 8, 4, Math.max(0, roofY - top - 8), color);
  }
  rectWorld(x + 5, top, 18, 8, trim);
}

function drawOfficePlant(x, ground) {
  rectWorld(x, ground - 20, 22, 20, "#8f6f43");
  rectWorld(x + 4, ground - 24, 14, 5, "#6b4931");
  rectWorld(x + 4, ground - 42, 4, 20, "#2d6657");
  rectWorld(x - 6, ground - 38, 16, 8, "#4f9a62");
  rectWorld(x + 8, ground - 48, 16, 8, "#5daa68");
  rectWorld(x + 6, ground - 34, 20, 8, "#35784e");
}

function drawPalm(x, ground, size = 1, curve = 0) {
  const s = size;
  const height = 190 * s;
  const top = ground - height;
  const segmentCount = 13;
  let crownX = x;

  for (let i = 0; i < segmentCount; i += 1) {
    const t = i / (segmentCount - 1);
    const segmentY = ground - 18 * s - t * (height - 34 * s);
    const sway = curve * (Math.sin(t * Math.PI * 0.82) * 18 + t * 14) * s;
    const trunkX = x + sway;
    if (i === segmentCount - 1) crownX = trunkX;
    rectWorld(trunkX - 3.5 * s, segmentY, 7 * s, 19 * s, "#8f6339");
    rectWorld(trunkX - 1 * s, segmentY + 2 * s, 2.5 * s, 17 * s, "#6d4c2d");
    if (i > 0 && i < segmentCount - 1 && i % 2 === 0) {
      rectWorld(trunkX - 5 * s, segmentY + 1 * s, 10 * s, 2.5 * s, i % 4 === 0 ? "#7a5637" : "#ad7a48");
    }
  }

  drawPalmCrown(crownX, top + 20 * s, s);
}

function drawPalmCrown(x, y, size) {
  const s = size;
  rectWorld(x - 8 * s, y - 14 * s, 16 * s, 18 * s, "#276f46");
  rectWorld(x - 4 * s, y - 28 * s, 8 * s, 18 * s, "#55ab68");
  rectWorld(x - 14 * s, y - 23 * s, 10 * s, 14 * s, "#3f9c5e");
  rectWorld(x + 4 * s, y - 23 * s, 10 * s, 14 * s, "#3f9c5e");
  rectWorld(x - 24 * s, y - 13 * s, 18 * s, 9 * s, "#348350");
  rectWorld(x + 6 * s, y - 13 * s, 18 * s, 9 * s, "#348350");
  rectWorld(x - 31 * s, y - 4 * s, 24 * s, 8 * s, "#2b774b");
  rectWorld(x + 7 * s, y - 4 * s, 24 * s, 8 * s, "#2b774b");
  rectWorld(x - 22 * s, y + 5 * s, 18 * s, 9 * s, "#3f9c5e");
  rectWorld(x + 4 * s, y + 5 * s, 18 * s, 9 * s, "#3f9c5e");
  rectWorld(x - 15 * s, y + 13 * s, 12 * s, 8 * s, "#276f46");
  rectWorld(x + 3 * s, y + 13 * s, 12 * s, 8 * s, "#276f46");
  rectWorld(x - 7 * s, y - 2 * s, 14 * s, 14 * s, "#276f46");
}

function drawLiferayOffice(x, y, width, height) {
  rectWorld(x, y + 28, width, height - 28, "#f7f8f5");
  rectWorld(x + 18, y + 8, width - 36, 28, "#eef1ee");
  rectWorld(x, y + height - 10, width, 10, "#d5dad0");
  rectWorld(x + 26, y + 44, width - 52, 16, "#162631");
  rectWorld(x + 26, y + 92, width - 52, 16, "#162631");

  for (let i = 0; i < 9; i += 1) {
    rectWorld(x + 38 + i * 25, y + 44, 14, 16, i % 3 === 0 ? "#cfe8e3" : "#243745");
    rectWorld(x + 38 + i * 25, y + 92, 14, 16, i % 2 === 0 ? "#cfe8e3" : "#243745");
  }

  rectWorld(x + 126, y + height - 56, 58, 46, "#d8d0bf");
  rectWorld(x + 112, y + height - 66, 86, 14, "#b8a57e");
  rectWorld(x + 122, y + height - 74, 66, 8, "#d1b177");
  rectWorld(x + 142, y + height - 44, 26, 34, "#253342");
  rectWorld(x + 153, y + height - 44, 3, 34, "#f4efe5");

  drawLiferayLogoMark(x + width - 106, y + 18, 2.45);
  text("LIFERAY", toScreenX(x + width - 88), toScreenY(y + 30), 13 * currentScale(), "#243447");
  rectWorld(x + 22, y + height - 4, width - 44, 4, "#8fb0bc");
}

function drawLiferayLogoMark(x, y, unit) {
  const cell = unit;
  const gap = unit * 0.28;
  const colors = ["#102f5f", "#1f4a82", "#73acd6"];
  const squares = [
    [0, 0, 0], [1, 0, 1], [3, 0, 2],
    [0, 1, 1], [2, 1, 2], [3, 1, 2],
    [0, 2, 2], [1, 2, 2], [3, 2, 0],
    [1, 3, 2], [2, 3, 1], [3, 3, 0]
  ];
  squares.forEach(([sx, sy, color]) => {
    rectWorld(x + sx * (cell + gap), y + sy * (cell + gap), cell, cell, colors[color]);
  });
}

function drawPartnerMap(x, y, size = 1) {
  const s = size;
  rectWorld(x, y, 182 * s, 112 * s, "#f3e4bc");
  rectWorld(x + 8 * s, y + 8 * s, 166 * s, 96 * s, "#efe0b3");
  const nodes = [[28, 28], [84, 54], [142, 26], [132, 82], [42, 82]];
  nodes.forEach(([nx, ny], i) => rectWorld(x + nx * s, y + ny * s, 22 * s, 22 * s, i === 1 ? "#54aba1" : "#27665c"));
  rectWorld(x + 50 * s, y + 39 * s, 78 * s, 4 * s, "#8c7b55");
  rectWorld(x + 55 * s, y + 77 * s, 74 * s, 4 * s, "#8c7b55");
}

function drawServicePackages(x, y, size = 1) {
  const s = size;
  const colors = ["#54aba1", "#f2e3bd", "#27665c"];
  for (let i = 0; i < 3; i += 1) {
    rectWorld(x + i * 42 * s, y + i * 8 * s, 72 * s, 24 * s, colors[i]);
    rectWorld(x + (8 + i * 42) * s, y + (7 + i * 8) * s, 46 * s, 4 * s, i === 1 ? "#27665c" : "#f2e3bd");
    rectWorld(x + (8 + i * 42) * s, y + (15 + i * 8) * s, 34 * s, 4 * s, i === 1 ? "#27665c" : "#f2e3bd");
  }
  rectWorld(x - 10 * s, y + 58 * s, 184 * s, 8 * s, "#8fb0bc");
}

function drawDocker(left) {
  drawSanFranciscoSkyline(left + 430, world.ground - 240);
  drawPortBackdrop(left + 430, world.ground - 218);
  drawStartupWarehouse(left + 58, world.ground - 256);
  drawMiddleGroundContainerShip(left + 360 + ((performance.now() * 0.000025) % 1) * 220, world.ground - 173);
  drawGroundedContainerStack(left + 430, world.ground - 112);
}

function drawWarehouse(x, y, color, label) {
  rectWorld(x, y + 42, 308, 142, "#eef4f8");
  rectWorld(x - 10, y, 328, 50, color);
  text(label, toScreenX(x + 108), toScreenY(y + 34), 22 * currentScale(), "#f8fbff");
  for (let i = 0; i < 5; i += 1) rectWorld(x + 28 + i * 54, y + 78, 36, 48, "#1f2b38");
}

function drawSanFranciscoSkyline(x, y) {
  const pale = "rgba(87,122,138,.2)";
  const mid = "rgba(70,108,126,.24)";
  rectWorld(x - 84, y + 112, 58, 128, pale);
  rectWorld(x - 18, y + 76, 54, 164, mid);
  rectWorld(x + 54, y + 42, 68, 198, pale);
  rectWorld(x + 76, y + 22, 22, 20, pale);
  rectWorld(x + 146, y + 96, 58, 144, mid);
  rectWorld(x + 234, y + 62, 46, 178, pale);
  rectWorld(x + 302, y + 28, 54, 212, mid);
  rectWorld(x + 374, y + 118, 82, 122, pale);
  for (let i = 0; i < 5; i += 1) {
    rectWorld(x - 2, y + 102 + i * 24, 22, 4, "rgba(255,255,255,.22)");
    rectWorld(x + 70, y + 68 + i * 25, 34, 4, "rgba(255,255,255,.2)");
    rectWorld(x + 310, y + 62 + i * 27, 28, 4, "rgba(255,255,255,.18)");
  }
  rectWorld(x + 470, y + 96, 130, 4, "rgba(70,108,126,.25)");
  rectWorld(x + 482, y + 100, 4, 46, "rgba(70,108,126,.25)");
  rectWorld(x + 568, y + 100, 4, 46, "rgba(70,108,126,.25)");
}

function drawStartupWarehouse(x, y) {
  rectWorld(x - 8, y + 20, 344, 236, "#1b2a33");
  rectWorld(x, y + 28, 328, 228, "#6d7377");
  rectWorld(x - 12, y + 12, 352, 18, "#33383e");
  rectWorld(x - 4, y + 26, 336, 7, "#a7aaac");
  rectWorld(x + 6, y + 88, 316, 8, "#4c5358");
  rectWorld(x + 6, y + 164, 316, 8, "#4c5358");

  for (let i = 0; i < 4; i += 1) {
    drawFactoryWindow(x + 22 + i * 76, y + 48, 54, 46);
    drawFactoryWindow(x + 22 + i * 76, y + 116, 54, 46);
  }

  rectWorld(x + 22, y + 182, 58, 74, "#dce3e6");
  drawGarageDoor(x + 28, y + 190, 46, 58);
  rectWorld(x + 94, y + 182, 92, 74, "#dce3e6");
  drawGarageDoor(x + 102, y + 190, 76, 58);
  rectWorld(x + 202, y + 182, 84, 74, "#dce3e6");
  drawGarageDoor(x + 210, y + 190, 68, 58);
  rectWorld(x + 292, y + 184, 28, 72, "#1f2e38");
  rectWorld(x + 298, y + 192, 16, 42, "#9bd4e8");

  rectWorld(x + 132, y + 168, 94, 24, "#4c5358");
  drawDockerWhaleLogo(x + 142, y + 172, 0.46);
  text("Docker", toScreenX(x + 170), toScreenY(y + 188), 15 * currentScale(), "#9bd4e8");
}

function drawFactoryWindow(x, y, width, height) {
  rectWorld(x - 8, y - 8, width + 16, height + 16, "#17202b");
  rectWorld(x, y, width, height, "#b9d4df");
  for (let row = 0; row < 2; row += 1) rectWorld(x, y + 14 + row * 14, width, 3, "#5f6b73");
  for (let col = 0; col < 4; col += 1) rectWorld(x + 10 + col * 10, y, 3, height, "#5f6b73");
  rectWorld(x + 4, y + 4, width - 8, 5, "rgba(255,255,255,.42)");
  rectWorld(x + width - 11, y + 6, 7, 16, "#f4dd98");
}

function drawGarageDoor(x, y, width, height) {
  rectWorld(x, y, width, height, "#eef4f8");
  for (let row = 0; row < 4; row += 1) rectWorld(x, y + 10 + row * 12, width, 3, "#9aa6ad");
  for (let col = 0; col < 3; col += 1) rectWorld(x + 12 + col * 16, y, 3, height, "#9aa6ad");
  rectWorld(x + 4, y + 4, width - 8, 6, "rgba(255,255,255,.32)");
}

function drawDockerWhaleLogo(x, y, size) {
  const s = size;
  rectWorld(x, y + 14 * s, 38 * s, 9 * s, "#46a6dc");
  rectWorld(x + 5 * s, y + 7 * s, 8 * s, 7 * s, "#46a6dc");
  rectWorld(x + 15 * s, y + 5 * s, 8 * s, 9 * s, "#46a6dc");
  rectWorld(x + 25 * s, y + 1 * s, 8 * s, 13 * s, "#46a6dc");
  rectWorld(x + 34 * s, y + 11 * s, 13 * s, 5 * s, "#46a6dc");
  rectWorld(x + 39 * s, y + 6 * s, 10 * s, 5 * s, "#7bc6e8");
  rectWorld(x + 10 * s, y + 18 * s, 3 * s, 3 * s, "#e8f4fb");
  rectWorld(x + 5 * s, y + 23 * s, 26 * s, 4 * s, "#9bd4e8");
}

function drawPortBackdrop(x, y) {
  const faint = "rgba(70,166,220,.3)";
  const line = "rgba(30,63,90,.38)";
  rectWorld(x - 10, y + 178, 482, 5, "rgba(30,63,90,.24)");
  rectWorld(x + 14, y + 146, 96, 32, faint);
  rectWorld(x + 136, y + 134, 124, 44, "rgba(85,163,217,.22)");
  rectWorld(x + 292, y + 144, 116, 34, faint);
  drawBackdropCrane(x + 30, y + 58, 0.72, line);
  drawBackdropCrane(x + 286, y + 48, 0.64, line);
  rectWorld(x - 6, y + 194, 470, 6, "rgba(123,198,232,.22)");
}

function drawBackdropCrane(x, y, size, color) {
  const s = size;
  rectWorld(x, y + 58 * s, 6 * s, 104 * s, color);
  rectWorld(x - 18 * s, y + 54 * s, 150 * s, 5 * s, color);
  rectWorld(x + 62 * s, y + 58 * s, 3 * s, 42 * s, color);
  rectWorld(x + 54 * s, y + 98 * s, 18 * s, 8 * s, color);
  rectWorld(x - 10 * s, y + 78 * s, 32 * s, 5 * s, color);
}

function drawShipSilhouette(x, y) {
  rectWorld(x, y + 30, 210, 18, "rgba(30,63,90,.25)");
  rectWorld(x + 18, y + 18, 68, 12, "rgba(30,63,90,.22)");
  rectWorld(x + 98, y + 10, 54, 20, "rgba(30,63,90,.22)");
  rectWorld(x + 160, y + 22, 36, 8, "rgba(30,63,90,.22)");
  rectWorld(x + 34, y + 38, 18, 4, "rgba(255,255,255,.32)");
  rectWorld(x + 62, y + 38, 18, 4, "rgba(255,255,255,.32)");
  rectWorld(x + 108, y + 25, 18, 4, "rgba(255,255,255,.28)");
}

function drawDockStripe(x, y) {
  rectWorld(x, y, 430, 6, "#26313a");
  for (let i = 0; i < 20; i += 1) {
    rectWorld(x + i * 22, y, 11, 6, "#e8c872");
  }
}

function drawPortWater(x, y) {
  rectWorld(x, y + 84, 478, 46, "#cfe8ef");
  rectWorld(x + 18, y + 96, 430, 6, "#9bd4e8");
  rectWorld(x + 64, y + 116, 342, 5, "#7bc6e8");
  rectWorld(x + 4, y + 130, 460, 8, "#9aa6ad");
}

function drawContainerShip(x, y) {
  drawShipHull(x, y + 112, 512);
  rectWorld(x + 84, y + 86, 394, 10, "#eef4f8");
  rectWorld(x + 90, y + 88, 386, 16, "#17202b");
  for (let i = 0; i < 18; i += 1) rectWorld(x + 96 + i * 20, y + 90, 4, 12, "#9aa6ad");

  rectWorld(x + 20, y + 52, 92, 60, "#dce3e6");
  rectWorld(x + 34, y + 28, 62, 26, "#eef4f8");
  rectWorld(x + 54, y + 10, 16, 18, "#eef4f8");
  rectWorld(x + 28, y + 46, 76, 6, "#26313a");
  rectWorld(x + 38, y + 68, 9, 7, "#1e3f5a");
  rectWorld(x + 62, y + 68, 9, 7, "#1e3f5a");
  rectWorld(x + 88, y + 68, 9, 7, "#1e3f5a");
  drawShipMast(x + 58, y - 10);
}

function drawMiddleGroundContainerShip(x, y) {
  const hull = "rgba(16,25,34,.58)";
  const hullLight = "rgba(38,49,58,.5)";
  const hullRed = "rgba(201,40,40,.42)";
  const rail = "rgba(238,244,248,.5)";
  const blueA = "rgba(28,117,188,.48)";
  const blueB = "rgba(70,166,220,.44)";
  const blueC = "rgba(85,163,217,.4)";
  const gray = "rgba(220,227,230,.62)";

  rectWorld(x + 44, y + 94, 548, 16, hullLight);
  rectWorld(x + 24, y + 108, 594, 42, hull);
  rectWorld(x + 48, y + 150, 520, 24, hullLight);
  rectWorld(x + 82, y + 174, 446, 7, hullRed);
  rectWorld(x + 6, y + 118, 34, 12, hull);
  rectWorld(x + 18, y + 130, 34, 14, hull);
  rectWorld(x + 30, y + 144, 34, 16, hull);
  rectWorld(x + 536, y + 118, 82, 32, hullLight);
  rectWorld(x + 594, y + 130, 34, 24, hull);

  rectWorld(x + 76, y + 78, 420, 8, rail);
  for (let i = 0; i < 18; i += 1) rectWorld(x + 86 + i * 22, y + 84, 4, 18, "rgba(238,244,248,.42)");

  rectWorld(x + 46, y + 52, 78, 56, gray);
  rectWorld(x + 58, y + 30, 52, 24, "rgba(238,244,248,.7)");
  rectWorld(x + 74, y + 16, 14, 18, "rgba(238,244,248,.66)");
  rectWorld(x + 56, y + 46, 62, 6, "rgba(23,32,43,.45)");
  for (let i = 0; i < 3; i += 1) rectWorld(x + 64 + i * 22, y + 68, 8, 7, "rgba(30,63,90,.58)");

  drawFadedShipContainer(x + 156, y + 52, 108, 40, blueA);
  drawFadedShipContainer(x + 266, y + 52, 112, 40, blueB);
  drawFadedShipContainer(x + 380, y + 52, 96, 40, blueC);
  drawFadedShipContainer(x + 178, y + 10, 126, 40, blueB);
  drawFadedShipContainer(x + 306, y + 10, 94, 40, blueA);
  drawFadedShipContainer(x + 402, y + 10, 110, 40, blueC);

  rectWorld(x + 120, y + 160, 20, 4, "rgba(155,212,232,.52)");
  rectWorld(x + 176, y + 160, 20, 4, "rgba(155,212,232,.52)");
  rectWorld(x + 318, y + 162, 22, 4, "rgba(155,212,232,.46)");
  rectWorld(x + 430, y + 160, 22, 4, "rgba(155,212,232,.46)");
}

function drawFadedShipContainer(x, y, width, height, color) {
  rectWorld(x, y, width, height, color);
  rectWorld(x, y, width, 5, "rgba(255,255,255,.12)");
  rectWorld(x, y + height - 5, width, 5, "rgba(0,0,0,.12)");
  for (let i = 0; i < Math.floor(width / 28); i += 1) {
    rectWorld(x + 14 + i * 28, y + 8, 8, height - 16, "rgba(255,255,255,.12)");
    rectWorld(x + 23 + i * 28, y + 7, 2, height - 14, "rgba(0,0,0,.1)");
  }
}

function drawShipContainerStack(x, y) {
  drawContainer(x + 150, y + 70, 100, 42, "#1c75bc", "GTM");
  drawContainer(x + 252, y + 70, 122, 42, "#55a3d9", "SALES");
  drawContainer(x + 376, y + 70, 94, 42, "#2f6f9c", "SERV");
  drawContainer(x + 472, y + 70, 62, 42, "#46a6dc", "CSM");

  drawContainer(x + 154, y + 26, 154, 42, "#46a6dc", "SUPPORT");
  drawContainer(x + 310, y + 26, 108, 42, "#1c75bc", "OPS");
  drawContainer(x + 420, y + 26, 116, 42, "#55a3d9", "STRAT");

  drawContainer(x + 224, y - 18, 140, 42, "#2f6f9c", "CSM");
  drawContainer(x + 366, y - 18, 150, 42, "#1c75bc", "SUPPORT");
}

function drawGroundedContainerStack(x, y) {
  rectWorld(x - 10, y + 112, 412, 8, "#26313a");
  drawContainer(x, y + 70, 86, 42, "#1c75bc", "SELL");
  drawContainer(x + 88, y + 70, 100, 42, "#55a3d9", "SCOPE");
  drawContainer(x + 190, y + 70, 106, 42, "#2f6f9c", "DELIVER");
  drawContainer(x + 298, y + 70, 100, 42, "#46a6dc", "SUPPORT");

  drawContainer(x + 56, y + 26, 82, 42, "#46a6dc", "HIRE");
  drawContainer(x + 140, y + 26, 84, 42, "#1c75bc", "PLAN");
  drawContainer(x + 226, y + 26, 78, 42, "#55a3d9", "OPS");

  drawContainer(x + 90, y - 18, 98, 42, "#2f6f9c", "SCALE");
  drawContainer(x + 190, y - 18, 118, 42, "#1c75bc", "REPORT");
}

function drawShipHull(x, y, width) {
  const dark = "#101922";
  const mid = "#1c2731";
  rectWorld(x + 34, y, width - 64, 18, "#26313a");
  rectWorld(x + 18, y + 18, width - 32, 24, dark);
  rectWorld(x + 28, y + 42, width - 36, 42, mid);
  rectWorld(x + 46, y + 84, width - 78, 24, dark);
  rectWorld(x + 4, y + 28, 34, 10, dark);
  rectWorld(x + 14, y + 38, 34, 12, dark);
  rectWorld(x + 24, y + 50, 34, 14, dark);
  rectWorld(x + 34, y + 64, 28, 16, dark);
  rectWorld(x + 44, y + 80, 20, 18, dark);
  rectWorld(x + width - 28, y + 36, 28, 48, mid);
  rectWorld(x + width - 18, y + 46, 18, 30, dark);
  rectWorld(x + width - 8, y + 54, 8, 10, "#9bd4e8");
  rectWorld(x + 50, y + 100, width - 106, 7, "#c92828");
  for (let i = 0; i < 7; i += 1) rectWorld(x + 106 + i * 48, y + 74, 22, 4, "#7bc6e8");
  rectWorld(x + 82, y + 30, 10, 10, "#0b1117");
  rectWorld(x + 122, y + 36, 7, 8, "#9bd4e8");
  rectWorld(x + 170, y + 38, 9, 8, "#9bd4e8");
}

function drawShipMast(x, y) {
  rectWorld(x + 22, y, 5, 72, "#5f6b73");
  rectWorld(x - 30, y + 66, 72, 5, "#5f6b73");
  drawSteppedLine(x + 24, y, x - 30, y + 66, "#5f6b73", 3);
  drawSteppedLine(x + 27, y, x + 42, y + 66, "#5f6b73", 3);
}

function drawContainer(x, y, width, height, color, label) {
  rectWorld(x, y, width, height, color);
  rectWorld(x, y, width, 6, "rgba(255,255,255,.16)");
  rectWorld(x, y + height - 6, width, 6, "rgba(0,0,0,.16)");
  for (let j = 0; j < Math.floor(width / 24); j += 1) {
    rectWorld(x + 12 + j * 24, y + 8, 8, height - 16, "rgba(255,255,255,.18)");
    rectWorld(x + 21 + j * 24, y + 7, 2, height - 14, "rgba(0,0,0,.12)");
  }
  if (label) text(label, toScreenX(x + 16), toScreenY(y + 29), 17 * currentScale(), "rgba(255,255,255,.82)");
}

function drawCraneTruck(x, y) {
  rectWorld(x + 24, y + 174, 248, 8, "#46525d");
  rectWorld(x + 28, y + 182, 244, 18, "#26313a");
  rectWorld(x + 34, y + 200, 232, 6, "#10151b");
  rectWorld(x + 34, y + 170, 44, 5, "#c92828");
  drawContainer(x + 96, y + 124, 130, 44, "#1c75bc", "");
  rectWorld(x + 108, y + 168, 114, 4, "#7bc6e8");
  rectWorld(x + 228, y + 130, 76, 52, "#0f4f86");
  rectWorld(x + 240, y + 110, 48, 24, "#e8f4fb");
  rectWorld(x + 256, y + 119, 26, 16, "#9bd4e8");
  rectWorld(x + 284, y + 138, 18, 44, "#1e3f5a");
  rectWorld(x + 302, y + 154, 14, 13, "#7bc6e8");
  rectWorld(x + 224, y + 182, 98, 11, "#162631");
  rectWorld(x + 318, y + 178, 10, 7, "#e8c872");
  rectWorld(x + 240, y + 168, 28, 5, "#7bc6e8");
  rectWorld(x + 292, y + 106, 4, 48, "#dce3e6");
  rectWorld(x + 306, y + 110, 4, 44, "#dce3e6");
  rectWorld(x + 288, y + 102, 8, 10, "#f4efe5");
  rectWorld(x + 304, y + 106, 8, 8, "#f4efe5");
  rectWorld(x + 256, y + 138, 34, 18, "#26313a");
  text("MACK", toScreenX(x + 260), toScreenY(y + 151), 9 * currentScale(), "#f4efe5");
  rectWorld(x + 230, y + 156, 30, 7, "#9aa6ad");
  rectWorld(x + 304, y + 180, 18, 20, "#9aa6ad");
  drawWheel(x + 58, y + 204);
  drawWheel(x + 86, y + 204);
  drawWheel(x + 184, y + 204);
  drawWheel(x + 224, y + 204);
  drawWheel(x + 268, y + 204);
}

function drawGantryCrane(x, y) {
  const yellow = "#e8c872";
  const orange = "#d7954d";
  const dark = "#1e3f5a";
  rectWorld(x + 10, y + 28, 18, 194, yellow);
  rectWorld(x + 352, y + 28, 18, 194, orange);
  rectWorld(x + 5, y + 22, 374, 14, yellow);
  rectWorld(x + 12, y + 34, 354, 8, "#f4dd98");
  rectWorld(x - 98, y + 34, 122, 9, yellow);
  rectWorld(x - 96, y + 42, 116, 5, "#f4dd98");
  rectWorld(x + 112, y + 14, 210, 8, "#d7954d");
  rectWorld(x + 24, y + 116, 322, 5, dark);
  rectWorld(x + 10, y + 112, 16, 6, orange);
  rectWorld(x + 352, y + 112, 16, 6, yellow);
  rectWorld(x + 10, y + 168, 16, 6, orange);
  rectWorld(x + 352, y + 168, 16, 6, yellow);
  rectWorld(x + 6, y + 222, 26, 8, dark);
  rectWorld(x + 348, y + 222, 26, 8, dark);
  rectWorld(x + 154, y + 42, 42, 10, "#46a6dc");
  rectWorld(x + 172, y + 52, 4, 102, dark);
  rectWorld(x + 164, y + 152, 20, 8, dark);
  rectWorld(x + 156, y + 160, 36, 12, "#7a4f9f");
  rectWorld(x + 160, y + 166, 28, 8, "#1c75bc");
}

function drawSuspendedContainer(x, y) {
  rectWorld(x + 58, y - 84, 4, 86, "#1e3f5a");
  rectWorld(x + 22, y - 2, 78, 34, "#55a3d9");
  rectWorld(x + 22, y - 2, 78, 5, "rgba(255,255,255,.18)");
  rectWorld(x + 22, y + 27, 78, 5, "rgba(0,0,0,.16)");
  for (let i = 0; i < 3; i += 1) {
    rectWorld(x + 34 + i * 18, y + 6, 7, 19, "rgba(255,255,255,.18)");
  }
}

function drawWheel(x, y) {
  rectWorld(x, y, 24, 24, "#11141a");
  rectWorld(x + 6, y + 6, 12, 12, "#56606a");
  rectWorld(x + 10, y + 10, 4, 4, "#9aa6b2");
}

function drawDashboard(x, y, label) {
  rectWorld(x, y, 224, 134, "#17202b");
  rectWorld(x, y, 224, 24, "#2a3544");
  text(label, toScreenX(x + 18), toScreenY(y + 54), 17 * currentScale(), "#e8f4fb");
  rectWorld(x + 20, y + 80, 38, 28, "#46a6dc");
  rectWorld(x + 74, y + 66, 38, 42, "#7bc6e8");
  rectWorld(x + 128, y + 50, 38, 58, "#e8c872");
}

function drawElastic(left) {
  drawMissionControlWall(left + 62, world.ground - 302);
  drawNorthAmericaMap(left + 96, world.ground - 268);
  drawForecastBoard(left + 596, world.ground - 266);
  drawWarRoomPanels(left + 410, world.ground - 232);
  drawKpiScreens(left + 410, world.ground - 166);
  drawConveyor(left + 168, world.ground - 86);
}

function drawMissionControlWall(x, y) {
  rectWorld(x + 16, y + 232, 764, 10, "rgba(16,21,28,.22)");
  rectWorld(x, y, 796, 236, "#111820");
  rectWorld(x + 12, y + 12, 772, 212, "#17202b");
  rectWorld(x + 12, y + 12, 772, 12, "#2a3544");
  rectWorld(x + 12, y + 212, 772, 12, "#0f151c");
  for (let i = 0; i < 12; i += 1) {
    rectWorld(x + 34 + i * 62, y + 32, 2, 168, "#232f3a");
  }
  for (let i = 0; i < 5; i += 1) {
    rectWorld(x + 28, y + 58 + i * 30, 736, 2, "#232f3a");
  }
}

function drawNorthAmericaMap(x, y) {
  rectWorld(x, y, 300, 186, "#0f151c");
  rectWorld(x + 8, y + 8, 284, 170, "#1b2430");
  text("TERRITORIES", toScreenX(x + 18), toScreenY(y + 26), 14 * currentScale(), "#8bdc65");

  const regions = [
    ["STRAT", x + 78, y + 38, 146, 24, "#8bdc65"],
    ["WEST", x + 42, y + 66, 82, 56, "#00bfb3"],
    ["CENTRAL", x + 120, y + 74, 74, 58, "#f8c537"],
    ["EAST", x + 188, y + 66, 66, 62, "#f04e98"],
    ["ENT", x + 132, y + 126, 88, 34, "#5aa2ff"]
  ];

  regions.forEach(([label, rx, ry, rw, rh, color], index) => {
    rectWorld(rx, ry, rw, rh, color);
    rectWorld(rx - 12, ry + 18, 16, 24, color);
    if (index === 0) rectWorld(rx + 116, ry + 20, 48, 24, color);
    if (index === 1) rectWorld(rx + 12, ry + 50, 38, 22, color);
    if (index === 2) rectWorld(rx + 18, ry + 52, 56, 18, color);
    if (index === 3) rectWorld(rx + 48, ry + 42, 26, 26, color);
    rectWorld(rx + 4, ry + 4, rw - 8, 5, "rgba(255,255,255,.25)");
    centeredWorldText(label, rx, ry, rw, rh, 10, "#10151b");
    if (index < 3) rectWorld(rx + rw - 8, ry + 8, 5, 5, "#f4efe5");
  });

  rectWorld(x + 30, y + 40, 40, 18, "#1b2430");
  rectWorld(x + 28, y + 128, 42, 28, "#1b2430");
  rectWorld(x + 218, y + 118, 36, 24, "#1b2430");
  rectWorld(x + 206, y + 34, 20, 22, "#1b2430");
  rectWorld(x + 82, y + 154, 104, 6, "#8fb0bc");
  rectWorld(x + 118, y + 164, 70, 5, "#8fb0bc");
}

function drawForecastBoard(x, y) {
  rectWorld(x, y, 226, 152, "#10151b");
  rectWorld(x + 8, y + 8, 210, 136, "#202a35");
  text("FORECAST", toScreenX(x + 22), toScreenY(y + 31), 15 * currentScale(), "#f4efe5");
  const live = liveForecastValues();
  const rows = [
    ["PIPELINE", live.pipeline.value, "#00bfb3", live.pipeline.previous, live.pipeline.progress],
    ["FORECAST", live.forecast.value, "#5aa2ff", live.forecast.previous, live.forecast.progress],
    ["QUOTA", "108%", "#f8c537", null, 0],
    ["ARR", live.arr.value, "#8bdc65", live.arr.previous, live.arr.progress]
  ];
  rows.forEach(([label, value, color, previous, progress], index) => {
    const rowY = y + 42 + index * 25;
    text(label, toScreenX(x + 18), toScreenY(rowY + 14), 10 * currentScale(), "#a9adb6");
    drawNumberTiles(x + 112, rowY, value, color, previous, progress);
  });
}

function liveForecastValues() {
  const now = performance.now();
  return {
    pipeline: rollingMetric(now, 84, 13, 950, "M"),
    forecast: rollingMetric(now + 320, 61, 10, 1200, "M"),
    arr: rollingMetric(now + 640, 142, 18, 1500, "M")
  };
}

function rollingMetric(now, base, range, interval, suffix) {
  const step = Math.floor(now / interval) % range;
  const previousStep = (step + range - 1) % range;
  return {
    value: `${base + step}${suffix}`,
    previous: `${base + previousStep}${suffix}`,
    progress: (now % interval) / interval
  };
}

function drawNumberTiles(x, y, value, color, previous = null, progress = 0) {
  [...value].forEach((char, index) => {
    const tileX = x + index * 18;
    const rolling = previous && previous[index] !== char && /\d/.test(char);
    rectWorld(tileX, y, 15, 19, "#0f151c");
    rectWorld(tileX + 2, y + 2, 11, 7, rolling ? "rgba(248,197,55,.25)" : "#2a3544");
    if (rolling) {
      drawRollingTileDigit(tileX, y, previous[index], char, color, progress);
    } else {
      text(char, toScreenX(tileX + 4), toScreenY(y + 15), 11 * currentScale(), color);
    }
  });
}

function drawRollingTileDigit(x, y, previous, current, color, progress) {
  const scale = currentScale();
  const eased = Math.min(1, Math.max(0, progress));
  const screenX = toScreenX(x);
  const screenY = toScreenY(y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px(screenX), px(screenY), px(15 * scale), px(19 * scale));
  ctx.clip();
  ctx.fillStyle = color;
  ctx.font = `${11 * scale}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.textAlign = "left";
  ctx.fillText(previous, px(toScreenX(x + 4)), px(toScreenY(y + 15 - eased * 19)));
  ctx.fillText(current, px(toScreenX(x + 4)), px(toScreenY(y + 15 + (1 - eased) * 19)));
  ctx.restore();
}

function drawKpiScreens(x, y) {
  drawKpiScreen(x, y, "PIPE", "#00bfb3", "line");
  drawKpiScreen(x + 96, y, "WIN", "#8bdc65", "bar");
}

function drawKpiScreen(x, y, label, color, chart) {
  rectWorld(x, y, 82, 64, "#10151b");
  rectWorld(x + 6, y + 6, 70, 52, "#1b2430");
  text(label, toScreenX(x + 12), toScreenY(y + 20), 10 * currentScale(), "#f4efe5");
  rectWorld(x + 58, y + 12, 8, 8, "#8bdc65");
  rectWorld(x + 62, y + 8, 4, 4, "#8bdc65");
  if (chart === "line") {
    drawPixelLineChart(x + 12, y + 48, color);
  } else {
    rectWorld(x + 18, y + 42, 10, 16, color);
    rectWorld(x + 34, y + 35, 10, 23, color);
    rectWorld(x + 50, y + 26, 10, 32, color);
  }
}

function drawPixelLineChart(x, y, color) {
  rectWorld(x, y, 12, 4, color);
  rectWorld(x + 12, y - 6, 12, 4, color);
  rectWorld(x + 24, y - 12, 12, 4, color);
  rectWorld(x + 36, y - 8, 12, 4, color);
  rectWorld(x + 48, y - 18, 12, 4, color);
}

function drawConveyor(x, y) {
  rectWorld(x - 30, y + 82, 636, 10, "rgba(16,18,22,.22)");
  rectWorld(x - 20, y + 50, 12, 20, "#10151b");
  rectWorld(x - 24, y + 54, 4, 12, "#10151b");
  rectWorld(x + 588, y + 50, 12, 20, "#10151b");
  rectWorld(x + 600, y + 54, 4, 12, "#10151b");
  rectWorld(x - 12, y + 60, 604, 12, "#10151b");
  rectWorld(x - 12, y + 48, 12, 12, "#3a4650");
  rectWorld(x + 580, y + 48, 12, 12, "#3a4650");
  rectWorld(x, y + 44, 580, 16, "#3a4650");
  rectWorld(x, y + 40, 580, 5, "#8fb0bc");
  rectWorld(x, y + 60, 580, 5, "#5f6b73");
  for (let i = 0; i < 19; i += 1) {
    rectWorld(x + 8 + i * 30, y + 48, 14, 8, i % 2 ? "#8fb0bc" : "#5f6b73");
  }
  for (let i = 0; i < 6; i += 1) {
    drawConveyorGear(x + 28 + i * 96, y + 52, i % 2 === 0);
  }
  for (let i = 0; i < 5; i += 1) {
    const legX = x + 34 + i * 126;
    rectWorld(legX, y + 68, 8, world.ground + 8 - (y + 68), "#3a4650");
    rectWorld(legX - 8, world.ground + 5, 24, 5, "#26313a");
  }
  const crates = [
    ["LEADS", 26, "#00bfb3"],
    ["PIPE", 166, "#5aa2ff"],
    ["DEALS", 318, "#f8c537"],
    ["REV", 492, "#8bdc65"]
  ];
  crates.forEach(([label, offset, color]) => drawRevenueCrate(x + offset, y - 18, label, color));
}

function drawConveyorGear(x, y, alternate) {
  const rim = alternate ? "#8fb0bc" : "#6f7d86";
  rectWorld(x - 14, y - 8, 28, 16, "#10151b");
  rectWorld(x - 18, y - 4, 36, 8, "#10151b");
  rectWorld(x - 10, y - 12, 20, 24, "#10151b");
  rectWorld(x - 10, y - 6, 20, 12, rim);
  rectWorld(x - 6, y - 10, 12, 20, rim);
  rectWorld(x - 4, y - 4, 8, 8, "#26313a");
}

function drawRevenueCrate(x, y, label, color) {
  rectWorld(x + 4, y + 58, 50, 6, "rgba(16,18,22,.24)");
  rectWorld(x, y, 58, 58, "#4f2f1d");
  rectWorld(x + 4, y + 4, 50, 50, "#9c6336");
  rectWorld(x + 8, y + 8, 42, 42, "#b8783e");
  rectWorld(x + 8, y + 8, 42, 6, "rgba(255,255,255,.16)");
  rectWorld(x + 8, y + 44, 42, 6, "rgba(0,0,0,.16)");

  rectWorld(x + 2, y + 2, 54, 8, "#7b4727");
  rectWorld(x + 2, y + 48, 54, 8, "#7b4727");
  rectWorld(x + 2, y + 10, 7, 38, "#6b3e22");
  rectWorld(x + 49, y + 10, 7, 38, "#6b3e22");
  rectWorld(x + 17, y + 10, 5, 38, "#8a4f25");
  rectWorld(x + 36, y + 10, 5, 38, "#8a4f25");

  for (let i = 0; i < 6; i += 1) {
    rectWorld(x + 10 + i * 7, y + 40 - i * 5, 12, 5, "#6b3e22");
    rectWorld(x + 12 + i * 7, y + 37 - i * 5, 12, 4, "#c8894b");
  }

  rectWorld(x + 10, y + 13, 38, 24, "#5a341f");
  rectWorld(x + 12, y + 15, 34, 20, color);
  rectWorld(x + 12, y + 15, 34, 4, "rgba(255,255,255,.25)");
  rectWorld(x + 11, y + 20, 36, 12, "#f4e2af");
  rectWorld(x + 11, y + 20, 36, 3, "rgba(255,255,255,.42)");
  rectWorld(x + 11, y + 30, 36, 2, "rgba(0,0,0,.2)");
  rectWorld(x + 13, y + 22, 2, 2, "#8a4f25");
  rectWorld(x + 43, y + 22, 2, 2, "#8a4f25");
  centeredWorldText(label, x + 11, y + 20, 36, 12, 8, "#10151b");
  rectWorld(x + 20, y + 5, 18, 3, "#c8894b");
  rectWorld(x + 22, y + 51, 14, 3, "#c8894b");
}

function drawArrMachine(x, y) {
  rectWorld(x, y, 92, 88, "#10151b");
  rectWorld(x + 8, y + 10, 76, 66, "#1b2430");
  rectWorld(x + 18, y - 10, 56, 24, "#2a3544");
  text("ARR", toScreenX(x + 27), toScreenY(y + 8), 18 * currentScale(), "#8bdc65");
  rectWorld(x - 22, y + 48, 24, 18, "#3a4650");
  rectWorld(x + 30, y + 32, 32, 24, "#8bdc65");
  rectWorld(x + 38, y + 22, 16, 12, "#00bfb3");
  rectWorld(x + 18, y + 78, 16, 10, "#5f6b73");
  rectWorld(x + 60, y + 78, 16, 10, "#5f6b73");
}

function drawWarRoomPanels(x, y) {
  drawIndicatorPanel(x, y, "QBR", "#8bdc65");
  drawIndicatorPanel(x + 62, y, "BOARD", "#f8c537");
  drawIndicatorPanel(x + 124, y, "PLAN", "#00bfb3");
}

function drawIndicatorPanel(x, y, label, color) {
  rectWorld(x, y, 54, 34, "#10151b");
  rectWorld(x + 5, y + 5, 44, 24, "#1b2430");
  rectWorld(x + 10, y + 12, 8, 8, color);
  rectWorld(x + 22, y + 14, 22, 4, "#5f6b73");
  text(label, toScreenX(x + 8), toScreenY(y + 27), 8 * currentScale(), "#f4efe5");
}

function drawIbm(left) {
  drawEcosystemClouds(left);
  drawGlobalCityBackdrop(left + 376, world.ground - 170);
  drawLeftIbmTerminal(left + 66, world.ground - 214);
  drawRightRunway(left + 332, world.ground + 4);
  drawBoxBoatJetway(left + 350, world.ground - 72);
  drawTakeoffJumbo747(left + 710, world.ground - 150);
}

function drawEcosystemClouds(left) {
  const scale = currentScale();
  const drift = (performance.now() * 0.006) % 760;
  const wrapCloudX = (baseX, size) => {
    const bandLeft = left + 170;
    const bandWidth = 760;
    const cloudWidth = 150 * size;
    const wrapped = bandLeft + ((((baseX - bandLeft + drift) % bandWidth) + bandWidth) % bandWidth);
    return wrapped > left + world.sceneWidth - cloudWidth - 24 ? wrapped - bandWidth - cloudWidth : wrapped;
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(px(toScreenX(left)), 0, px(world.sceneWidth * scale), canvas.height);
  ctx.clip();
  [
    [462, 58, "IBM", "#4f7bd9", 1.18],
    [616, 112, "GitHub", "#24292f", 0.92],
    [336, 120, "Microsoft", "#2c61d6", 0.92],
    [712, 54, "Red Hat", "#cc342d", 0.88],
    [248, 76, "GitLab", "#e06b2f", 0.82],
    [762, 138, "Google Cloud", "#4f7bd9", 0.78]
  ].forEach(([x, y, label, color, size]) => {
    drawPartnerCloud(wrapCloudX(left + x, size), y, label, color, size);
  });
  ctx.restore();
}

function drawPartnerCloud(x, y, label, color, size = 1) {
  const s = size;
  rectWorld(x, y + 28 * s, 136 * s, 24 * s, "rgba(255,255,255,.8)");
  rectWorld(x + 18 * s, y + 12 * s, 44 * s, 44 * s, "rgba(255,255,255,.86)");
  rectWorld(x + 54 * s, y, 58 * s, 58 * s, "rgba(255,255,255,.9)");
  rectWorld(x + 104 * s, y + 18 * s, 46 * s, 36 * s, "rgba(255,255,255,.82)");
  rectWorld(x + 18 * s, y + 52 * s, 112 * s, 7 * s, "rgba(189,220,229,.55)");
  centeredWorldText(label, x, y + 26 * s, 150 * s, 24 * s, (label.length > 8 ? 10 : 14) * s, color);
}

function drawBoxBoatTerminalScene(x, y) {
  drawDistantAirportCity(x + 20, y + 72);
  drawBoxBoatTerminal(x, y + 26);
  drawAirportApron(x - 24, y + 196);
  drawTerminalPlane(x + 236, y + 158);
  drawGroundServiceCart(x + 118, y + 202);
  drawGroundServiceCart(x + 604, y + 198);
}

function drawLeftIbmTerminal(x, y) {
  const dark = "#17202b";
  const roof = "#243447";
  const glass = "#83a9bb";
  rectWorld(x + 4, y + 206, 308, 10, "rgba(16,18,22,.18)");
  rectWorld(x + 10, y + 82, 292, 136, "#1e2f3b");
  rectWorld(x + 24, y + 92, 264, 92, glass);
  rectWorld(x + 24, y + 92, 264, 8, "#b9d2dc");
  rectWorld(x + 24, y + 178, 264, 8, "#5f7f8c");

  drawSweptTerminalCanopy(x - 67, y + 2);
  rectWorld(x + 8, y + 70, 18, 44, "#10151b");
  rectWorld(x + 288, y + 70, 18, 44, "#10151b");
  rectWorld(x + 90, y + 28, 136, 28, "#10151b");
  rectWorld(x + 98, y + 34, 120, 16, "#f4efe5");
  text("IBM", toScreenX(x + 134), toScreenY(y + 49), 24 * currentScale(), "#4f7bd9");
  rectWorld(x + 6, y + 84, 304, 5, "#314656");

  for (let col = 0; col < 9; col += 1) {
    const gx = x + 34 + col * 28;
    rectWorld(gx, y + 94, 4, 86, roof);
    rectWorld(gx + 8, y + 104 + (col % 3) * 8, 16, 3, "rgba(255,255,255,.42)");
  }
  for (let row = 0; row < 4; row += 1) {
    rectWorld(x + 24, y + 112 + row * 18, 264, 4, roof);
  }

  rectWorld(x + 134, y + 82, 34, 136, dark);
  rectWorld(x + 162, y + 82, 7, 136, "#314656");
  rectWorld(x + 34, y + 184, 98, 34, "#26313d");
  rectWorld(x + 180, y + 184, 98, 34, "#26313d");
  rectWorld(x + 44, y + 194, 78, 5, "#d9e5ff");
  rectWorld(x + 190, y + 194, 78, 5, "#314656");
  rectWorld(x + 124, y + 144, 54, 28, "rgba(244,239,229,.16)");
  rectWorld(x + 130, y + 150, 42, 4, "#f8c537");
  rectWorld(x + 130, y + 158, 42, 4, "#f8c537");
  rectWorld(x + 14, y + 216, 288, 8, "#5f6b73");
}

function drawSweptTerminalCanopy(x, y) {
  const dark = "#10151b";
  const roof = "#243447";
  const mid = "#2f4555";
  const trim = "#3a5060";

  rectWorld(x + 54, y + 80, 340, 12, dark);
  rectWorld(x + 68, y + 70, 312, 12, roof);
  rectWorld(x + 82, y + 82, 284, 10, mid);
  rectWorld(x + 112, y + 92, 226, 7, trim);
  rectWorld(x + 144, y + 99, 162, 6, "#435c6d");

  const leftRows = [
    [22, 18, 96, 8],
    [36, 26, 86, 8],
    [48, 34, 72, 8],
    [58, 42, 56, 9],
    [64, 51, 42, 10],
    [68, 61, 28, 13]
  ];
  const rightRows = [
    [328, 18, 96, 8],
    [324, 26, 86, 8],
    [326, 34, 72, 8],
    [334, 42, 56, 9],
    [348, 51, 42, 10],
    [366, 61, 28, 13]
  ];

  [...leftRows, ...rightRows].forEach(([rx, ry, rw, rh], index) => {
    rectWorld(x + rx, y + ry, rw, rh, index % 2 ? roof : dark);
  });
  rectWorld(x + 44, y + 16, 348, 9, dark);
  rectWorld(x + 68, y + 14, 286, 8, roof);
  rectWorld(x + 106, y + 13, 210, 6, mid);
  rectWorld(x + 136, y + 12, 144, 4, trim);
}

function drawIbmWordmark(x, y, size = 1) {
  text("IBM", toScreenX(x), toScreenY(y), 20 * currentScale() * size, "#4f7bd9");
}

function drawRightRunway(x, y) {
  const runwayY = world.ground + 10;
  const runwayH = 32;
  const runwayW = 620;
  rectWorld(x - 10, runwayY, runwayW, runwayH, "#8fa0a9");
  rectWorld(x - 10, runwayY + 23, runwayW, 9, "#5f6b73");
  rectWorld(x - 10, runwayY - 3, runwayW, 5, "#7f965d");
  rectWorld(x + 24, runwayY + 6, runwayW - 60, 4, "#d9e5ff");
  rectWorld(x + 20, runwayY + 23, runwayW - 54, 3, "#26313d");
  for (let i = 0; i < 10; i += 1) {
    rectWorld(x + 42 + i * 54, runwayY + 16, 24, 4, "#eef6fb");
    rectWorld(x + 38 + i * 56, runwayY + 27, 22, 4, "#26313d");
  }
  rectWorld(x + 366, runwayY - 58, 118, 24, "rgba(79,123,217,.18)");
  rectWorld(x + 394, runwayY - 74, 68, 18, "rgba(79,123,217,.14)");
}

function drawBoxBoatJetway(x, y) {
  rectWorld(x, y + 54, 26, 20, "#26313d");
  rectWorld(x + 20, y + 46, 184, 24, "#8fa0a9");
  rectWorld(x + 30, y + 51, 166, 14, "#c5d6ec");
  rectWorld(x + 192, y + 40, 38, 28, "#26313d");
  rectWorld(x + 198, y + 45, 26, 14, "#83a9bb");
  rectWorld(x + 28, y + 68, 6, 54, "#3a4650");
  rectWorld(x + 184, y + 68, 6, 48, "#3a4650");
}

function drawGlobalCityBackdrop(x, y) {
  const icons = [
    [0, 64, 54, 112],
    [58, 34, 44, 142],
    [114, 74, 70, 102],
    [204, 18, 56, 158],
    [272, 52, 82, 124],
    [376, 42, 42, 134],
    [448, 72, 70, 104]
  ];
  icons.forEach(([dx, dy, w, h], index) => {
    const tint = index % 2 === 0 ? "rgba(79,92,104,.18)" : "rgba(79,123,217,.14)";
    rectWorld(x + dx, y + dy, w, h, tint);
    rectWorld(x + dx + 8, y + dy - 10, Math.max(8, w - 18), 10, "rgba(79,92,104,.12)");
    for (let row = 0; row < 4; row += 1) {
      rectWorld(x + dx + 12, y + dy + 18 + row * 26, w - 24, 4, "rgba(255,255,255,.18)");
    }
  });
  rectWorld(x - 24, y + 176, 566, 6, "rgba(79,92,104,.22)");
  rectWorld(x + 358, y + 92, 110, 5, "rgba(79,92,104,.18)");
  rectWorld(x + 358, y + 92, 4, 82, "rgba(79,92,104,.18)");
  rectWorld(x + 464, y + 92, 4, 82, "rgba(79,92,104,.18)");
}

function drawDistantAirportCity(x, y) {
  for (let i = 0; i < 10; i += 1) {
    const h = 22 + (i % 4) * 12;
    rectWorld(x + i * 66, y - h, 28 + (i % 3) * 10, h, "rgba(79,92,104,.22)");
    rectWorld(x + 8 + i * 66, y - h - 10, 8, 10, "rgba(79,92,104,.18)");
  }
  rectWorld(x - 20, y, 720, 6, "rgba(79,92,104,.28)");
}

function drawBoxBoatTerminal(x, y) {
  const roof = "#243447";
  const glass = "#83a9bb";
  rectWorld(x + 44, y + 24, 642, 22, "#10151b");
  rectWorld(x + 60, y + 12, 610, 18, roof);
  rectWorld(x + 82, y + 4, 566, 12, "#2f4555");
  rectWorld(x + 30, y + 42, 684, 132, "#1e2f3b");
  rectWorld(x + 46, y + 54, 652, 102, glass);
  rectWorld(x + 46, y + 54, 652, 8, "#b9d2dc");
  for (let col = 0; col < 16; col += 1) {
    const gx = x + 58 + col * 39;
    rectWorld(gx, y + 56, 4, 100, "#243447");
    rectWorld(gx + 8, y + 66, 22, 3, "rgba(255,255,255,.38)");
    if (col % 3 === 0) rectWorld(gx + 12, y + 104, 18, 4, "rgba(255,255,255,.24)");
  }
  for (let row = 0; row < 4; row += 1) {
    rectWorld(x + 46, y + 72 + row * 22, 652, 4, "#243447");
  }
  rectWorld(x + 300, y + 42, 38, 132, "#17202b");
  rectWorld(x + 326, y + 42, 8, 132, "#314656");
  rectWorld(x + 76, y + 144, 186, 30, "#26313d");
  rectWorld(x + 430, y + 144, 230, 30, "#26313d");
  rectWorld(x + 466, y + 151, 154, 6, "#4f7bd9");
  text("IBM", toScreenX(x + 86), toScreenY(y + 164), 17 * currentScale(), "#4f7bd9");
  rectWorld(x + 94, y - 12, 22, 22, "#4f7bd9");
  text("BB", toScreenX(x + 98), toScreenY(y + 5), 9 * currentScale(), "#f4efe5");
}

function drawAirportApron(x, y) {
  rectWorld(x, y, 770, 68, "#8fa0a9");
  rectWorld(x, y + 50, 770, 18, "#5f6b73");
  rectWorld(x + 20, y + 18, 720, 3, "#d9e5ff");
  for (let i = 0; i < 12; i += 1) {
    rectWorld(x + 46 + i * 58, y + 32, 24, 3, "#d9e5ff");
    rectWorld(x + 30 + i * 60, y + 56, 22, 3, "#26313d");
  }
}

function drawTerminalPlane(x, y) {
  rectWorld(x + 12, y + 56, 300, 14, "#26313d");
  rectWorld(x + 22, y + 38, 248, 32, "#f4efe5");
  rectWorld(x + 270, y + 42, 38, 24, "#f4efe5");
  rectWorld(x + 306, y + 48, 20, 14, "#f4efe5");
  rectWorld(x + 322, y + 52, 8, 8, "#f4efe5");
  rectWorld(x + 14, y + 46, 22, 20, "#f4efe5");
  rectWorld(x + 4, y + 54, 16, 10, "#f4efe5");

  rectWorld(x + 18, y + 8, 30, 38, "#f4efe5");
  rectWorld(x + 12, y - 4, 18, 18, "#f4efe5");
  rectWorld(x + 8, y + 16, 44, 10, "#4f7bd9");
  rectWorld(x + 82, y + 68, 130, 20, "#4f7bd9");
  rectWorld(x + 94, y + 24, 132, 18, "#4f7bd9");
  rectWorld(x + 112, y + 20, 98, 5, "#7bc6e8");

  rectWorld(x + 42, y + 40, 34, 14, "#83a9bb");
  rectWorld(x + 46, y + 43, 24, 5, "#d9e5ff");
  for (let i = 0; i < 12; i += 1) {
    rectWorld(x + 86 + i * 15, y + 44, 7, 5, "#83a9bb");
    rectWorld(x + 86 + i * 15, y + 45, 7, 2, "#d9e5ff");
  }

  rectWorld(x + 116, y + 72, 44, 16, "#26313d");
  rectWorld(x + 126, y + 76, 24, 8, "#83a9bb");
  rectWorld(x + 228, y + 68, 36, 16, "#26313d");
  rectWorld(x + 237, y + 72, 18, 8, "#83a9bb");
  rectWorld(x + 28, y + 64, 218, 4, "#c5d6ec");
  drawPlaneWheel(x + 112, y + 82);
  drawPlaneWheel(x + 250, y + 78);
}

function drawTakeoffJumbo747(x, y) {
  const scale = currentScale();
  const progress = (performance.now() * 0.00011) % 1;
  const liftX = x + progress * 42;
  const liftY = y - progress * 24;
  const sx = toScreenX(liftX);
  const sy = toScreenY(liftY);
  const unit = 1.18 * scale;

  ctx.save();
  ctx.translate(px(sx), px(sy));
  ctx.rotate(-0.13);

  const p = (gx, gy, gw, gh, color) => fillRect(gx * unit, gy * unit, gw * unit, gh * unit, color);
  const outline = "#17202b";
  const white = "#f7fbff";
  const shadow = "#d9e5ff";
  const glass = "#83a9bb";
  const blue = "#4f7bd9";
  const deepBlue = "#26313d";
  const midBlue = "#7bc6e8";

  p(-170, 4, 208, 30, outline);
  p(36, 6, 30, 27, outline);
  p(62, 9, 28, 22, outline);
  p(84, 14, 18, 16, outline);
  p(99, 20, 9, 9, outline);
  p(-184, 13, 18, 15, outline);
  p(-176, 29, 218, 14, outline);

  p(-164, 8, 200, 22, white);
  p(38, 10, 28, 18, white);
  p(62, 13, 26, 14, white);
  p(84, 17, 16, 8, white);
  p(101, 22, 5, 4, white);
  p(-178, 15, 15, 10, white);
  p(-170, 30, 214, 8, shadow);
  p(40, 31, 44, 7, shadow);
  p(80, 29, 14, 4, shadow);

  p(-158, 31, 220, 7, blue);
  p(-130, 26, 84, 4, midBlue);
  p(34, 27, 34, 5, midBlue);

  p(-170, -44, 12, 50, outline);
  p(-160, -36, 12, 42, outline);
  p(-150, -24, 12, 30, outline);
  p(-158, -36, 14, 10, outline);
  p(-168, -34, 13, 40, blue);
  p(-158, -28, 11, 34, "#6f99df");
  p(-148, -18, 9, 24, midBlue);
  p(-174, 3, 44, 10, white);

  p(-184, 36, 56, 9, outline);
  p(-180, 44, 42, 6, outline);
  p(-178, 37, 44, 6, blue);
  p(-168, 45, 28, 4, midBlue);

  p(-52, 29, 94, 12, outline);
  p(-74, 38, 88, 12, outline);
  p(-98, 47, 70, 10, outline);
  p(-110, 55, 46, 8, outline);
  p(-46, 31, 78, 7, blue);
  p(-68, 40, 74, 7, "#6f99df");
  p(-92, 49, 54, 6, midBlue);
  p(-102, 57, 34, 4, "#d9e5ff");

  p(-146, 13, 9, 7, glass);
  for (let i = 0; i < 12; i += 1) {
    p(-118 + i * 13, 13, 6, 6, deepBlue);
    p(-116 + i * 13, 14, 3, 3, shadow);
  }
  p(61, 15, 9, 7, glass);

  ctx.fillStyle = deepBlue;
  ctx.font = `${14 * unit}px "Tiny5", ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("BoxBoat", px(-45 * unit), px(29 * unit));

  for (let i = 0; i < 5; i += 1) {
    p(-202 - i * 14, 39 + i * 3, 9, 3, i % 2 ? "#c5d6ec" : "#94a9d8");
  }

  ctx.restore();
}

function drawPlaneWheel(x, y) {
  rectWorld(x, y, 20, 20, "#10151b");
  rectWorld(x + 5, y + 5, 10, 10, "#d9e5ff");
}

function drawGroundServiceCart(x, y) {
  rectWorld(x, y, 54, 22, "#6b4931");
  rectWorld(x + 8, y - 14, 38, 14, "#d7954d");
  rectWorld(x + 46, y + 4, 20, 8, "#26313d");
  rectWorld(x + 8, y + 20, 10, 10, "#10151b");
  rectWorld(x + 40, y + 20, 10, 10, "#10151b");
}

function drawEcosystemRouteLines(x, y) {
  const routes = [
    [[x + 20, y + 10], [x + 88, y - 72], [x + 192, y - 96]],
    [[x + 20, y + 10], [x + 150, y - 34], [x + 270, y - 22]],
    [[x + 20, y + 10], [x + 78, y - 8], [x + 142, y + 24]],
    [[x + 20, y + 10], [x + 210, y - 92], [x + 430, y - 110]]
  ];
  routes.forEach((route, index) => drawStaticPixelRoute(route, index === 0 ? "#4f7bd9" : "#94a9d8"));
}

function drawStaticPixelRoute(points, color) {
  points.forEach(([x, y], index) => {
    rectWorld(x, y, 5, 5, color);
    if (index === 0) return;
    const [prevX, prevY] = points[index - 1];
    for (let i = 1; i < 10; i += 1) {
      if (i % 2 !== 0) continue;
      rectWorld(prevX + ((x - prevX) * i) / 10, prevY + ((y - prevY) * i) / 10, 4, 4, color);
    }
  });
}

function drawWorldRoutes(x, y) {
  rectWorld(x - 54, y + 6, 492, 142, "rgba(79,123,217,.07)");
  rectWorld(x - 20, y + 54, 108, 42, "rgba(79,123,217,.12)");
  rectWorld(x + 126, y + 40, 74, 62, "rgba(79,123,217,.12)");
  rectWorld(x + 236, y + 44, 82, 50, "rgba(79,123,217,.12)");
  rectWorld(x + 348, y + 58, 46, 34, "rgba(79,123,217,.12)");

  const routes = [
    [[x + 24, y + 78], [x + 104, y + 62], [x + 196, y + 72], [x + 284, y + 58]],
    [[x + 24, y + 78], [x + 120, y + 92], [x + 214, y + 96], [x + 330, y + 86]],
    [[x + 24, y + 78], [x + 78, y + 42], [x + 154, y + 34], [x + 244, y + 42]]
  ];
  routes.forEach((route, index) => drawPixelRoute(route, index === 0 ? "#4f7bd9" : "#94a9d8"));
}

function drawPixelRoute(points, color) {
  const litStep = Math.floor(performance.now() / 180) % 12;
  points.forEach(([x, y], index) => {
    rectWorld(x, y, 5, 5, color);
    if (index === 0) return;
    const [px0, py0] = points[index - 1];
    const steps = 12;
    for (let i = 1; i < steps; i += 1) {
      const sx = px0 + ((x - px0) * i) / steps;
      const sy = py0 + ((y - py0) * i) / steps;
      if (i % 2 === 0) rectWorld(sx, sy, 4, 4, i === litStep ? "#f8c537" : color);
    }
  });
}

function drawRoutePins(x, y) {
  [
    ["Raleigh", 0, 0],
    ["Boston", 72, -20],
    ["Toronto", 126, -28],
    ["London", 238, -20],
    ["Amsterdam", 298, -34],
    ["Madrid", 334, 8]
  ].forEach(([label, dx, dy], index) => {
    const color = index === 0 ? "#f8c537" : "#d9e5ff";
    rectWorld(x + dx, y + dy, 7, 7, color);
    text(label, toScreenX(x + dx + 10), toScreenY(y + dy + 8), 7 * currentScale(), "#4f5c68");
  });
}

function drawSkyAircraft(x, y, label, body, accent) {
  rectWorld(x, y, 112, 16, body);
  rectWorld(x + 88, y - 18, 22, 18, body);
  rectWorld(x + 32, y + 14, 38, 12, accent);
  rectWorld(x + 38, y - 12, 46, 12, accent);
  rectWorld(x + 10, y + 5, 10, 5, "#4f7bd9");
  text(label, toScreenX(x + 20), toScreenY(y + 12), 9 * currentScale(), accent);
}

function drawEnterpriseCity(x, y) {
  const towers = [
    [0, 88, 64, 190, "#d9e5ff"],
    [58, 50, 78, 228, "#c5d6ec"],
    [126, 16, 86, 262, "#94a9d8"],
    [204, 70, 70, 208, "#d9e5ff"],
    [264, 38, 66, 240, "#b7c9e5"]
  ];
  towers.forEach(([dx, dy, w, h, color], index) => {
    rectWorld(x + dx, y + dy, w, h, color);
    rectWorld(x + dx, y + dy, w, 8, "#4f5c68");
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        rectWorld(x + dx + 14 + col * 16, y + dy + 22 + row * 28, 8, 14, (row + col + index) % 3 === 0 ? "#f8c537" : "#eef6fb");
      }
    }
  });
  rectWorld(x + 126, y, 86, 40, "#26313d");
  text("IBM", toScreenX(x + 143), toScreenY(y + 30), 28 * currentScale(), "#4f7bd9");
  for (let i = 0; i < 5; i += 1) rectWorld(x + 142, y + 48 + i * 16, 58, 4, "#4f7bd9");
  drawBridge(x - 64, y + 228);
  drawCrane(x + 300, y + 150, "#4f7bd9");
}

function drawBridge(x, y) {
  rectWorld(x, y + 34, 250, 10, "#5f6b73");
  for (let i = 0; i < 6; i += 1) {
    rectWorld(x + 12 + i * 42, y + 8, 4, 38, "#8fb0bc");
    rectWorld(x + 10 + i * 42, y + 8, 34, 4, "#8fb0bc");
  }
}

function drawCrane(x, y, color) {
  rectWorld(x, y, 8, 108, color);
  rectWorld(x - 58, y + 10, 126, 6, color);
  rectWorld(x + 54, y + 16, 4, 58, "#26313d");
  rectWorld(x + 42, y + 72, 28, 16, "#f8c537");
}

function drawIbmTerminal(x, y) {
  rectWorld(x, y + 74, 260, 82, "#eef6fb");
  rectWorld(x + 8, y + 56, 244, 24, "#26313d");
  text("IBM GLOBAL TERMINAL", toScreenX(x + 32), toScreenY(y + 74), 13 * currentScale(), "#f4efe5");
  for (let i = 0; i < 6; i += 1) {
    const gateX = x + 24 + i * 36;
    rectWorld(gateX, y + 98, 22, 42, "#d9e5ff");
    rectWorld(gateX + 4, y + 106, 14, 10, "#94a9d8");
  }
  drawGatePlane(x + 78, y + 124, "#d9e5ff", "#4f7bd9", "MSFT");
  drawGatePlane(x + 164, y + 112, "#f4efe5", "#cc342d", "RH");
}

function drawBoxBoatAirport(x, y) {
  rectWorld(x, y + 68, 236, 82, "#e8edf6");
  rectWorld(x + 10, y + 46, 216, 30, "#26313d");
  text("BoxBoat", toScreenX(x + 68), toScreenY(y + 68), 18 * currentScale(), "#f4efe5");
  rectWorld(x + 24, y + 92, 58, 38, "#d9e5ff");
  rectWorld(x + 92, y + 92, 58, 38, "#d9e5ff");
  rectWorld(x + 168, y + 72, 54, 78, "#c5d6ec");
  rectWorld(x + 174, y + 84, 42, 10, "#4f7bd9");
  for (let i = 0; i < 3; i += 1) {
    rectWorld(x + 32 + i * 20, y + 100, 10, 22, "#94a9d8");
    rectWorld(x + 100 + i * 20, y + 100, 10, 22, "#94a9d8");
  }
  drawHangar(x + 10, y + 132);
  drawGatePlane(x + 178, y + 154, "#f4efe5", "#24292f", "GitHub");
}

function drawHangar(x, y) {
  rectWorld(x, y - 62, 96, 62, "#d9e5ff");
  rectWorld(x + 10, y - 78, 76, 18, "#4f7bd9");
  text("HANGAR", toScreenX(x + 20), toScreenY(y - 65), 10 * currentScale(), "#f4efe5");
  rectWorld(x + 22, y - 38, 54, 38, "#8fb0bc");
  rectWorld(x + 30, y - 30, 38, 30, "#26313d");
}

function drawGatePlane(x, y, body, accent, label) {
  rectWorld(x, y, 96, 18, body);
  rectWorld(x + 76, y - 18, 20, 18, body);
  rectWorld(x + 28, y + 14, 38, 12, accent);
  rectWorld(x + 36, y - 12, 34, 10, accent);
  rectWorld(x + 10, y + 6, 8, 5, "#4f7bd9");
  text(label, toScreenX(x + 22), toScreenY(y + 14), 8 * currentScale(), accent);
}

function drawAirportRunway(x, y) {
  const runwayY = world.ground + 10;
  rectWorld(x, runwayY, 820, 34, "#26313d");
  rectWorld(x, runwayY + 34, 820, 8, "#10151b");
  for (let i = 0; i < 18; i += 1) {
    rectWorld(x + 18 + i * 44, runwayY + 14, 22, 4, i % 2 === 0 ? "#f8c537" : "#eef6fb");
  }
  const blink = Math.floor(performance.now() / 360) % 2 === 0;
  for (let i = 0; i < 24; i += 1) {
    rectWorld(x + i * 34, runwayY - 4, 5, 5, blink ? "#8bdc65" : "#5f6b73");
  }
}

function drawTaxiPlane(x, y) {
  const offset = (performance.now() * 0.018) % 120;
  drawGatePlane(x + offset, y, "#f4efe5", "#4f7bd9", "OSS");
  rectWorld(x + offset + 20, y + 18, 10, 10, "#10151b");
  rectWorld(x + offset + 68, y + 18, 10, 10, "#10151b");
}

function drawTakeoffPlane(x, y) {
  const progress = (performance.now() * 0.00018) % 1;
  const px = x + progress * 150;
  const py = y - progress * 72;
  drawGatePlane(px, py, "#f4efe5", "#2c61d6", "IBM");
  for (let i = 0; i < 5; i += 1) {
    rectWorld(px - 14 - i * 12, py + 22 + i * 5, 8, 3, "#94a9d8");
  }
}

function drawSkybridges(x, y) {
  rectWorld(x, y + 34, 336, 12, "#c5d6ec");
  rectWorld(x + 22, y + 46, 210, 8, "#8fb0bc");
  rectWorld(x + 258, y + 4, 92, 10, "#c5d6ec");
  rectWorld(x + 302, y + 14, 8, 54, "#8fb0bc");
}

function drawDepartureBoard(x, y) {
  rectWorld(x, y, 174, 132, "#10151b");
  rectWorld(x + 8, y + 8, 158, 116, "#1b2430");
  text("DEPARTURES", toScreenX(x + 20), toScreenY(y + 28), 12 * currentScale(), "#f8c537");
  ["GitHub", "Microsoft", "Red Hat", "OpenShift", "Kubernetes"].forEach((label, index) => {
    const rowY = y + 42 + index * 16;
    rectWorld(x + 18, rowY, 8, 8, index % 2 ? "#8bdc65" : "#4f7bd9");
    text(label, toScreenX(x + 32), toScreenY(rowY + 9), 9 * currentScale(), "#d9e5ff");
  });
}

function drawCargoFlow(x, y) {
  rectWorld(x, y + 56, 454, 14, "#3a4650");
  for (let i = 0; i < 15; i += 1) rectWorld(x + 8 + i * 30, y + 60, 14, 6, "#8fb0bc");
  const labels = ["Services", "Partners", "GTM", "Enablement", "Solutions"];
  labels.forEach((label, index) => {
    const cx = x + 10 + index * 82 + ((performance.now() * 0.012) % 18);
    rectWorld(cx, y + 18, 72, 38, index % 2 ? "#4f7bd9" : "#94a9d8");
    rectWorld(cx + 6, y + 24, 60, 6, "rgba(255,255,255,.28)");
    text(label, toScreenX(cx + 8), toScreenY(y + 44), 8 * currentScale(), "#f4efe5");
  });
}

function drawCodeCargo(left) {
  drawTerminal(left + 40, world.ground - 174, "CodeCargo", "> build gtm --from-zero");
  drawAiRobotBackend(left + 326, world.ground - 220);
  text("GitHub Universe", toScreenX(left + 80), toScreenY(world.ground - 198), 18 * currentScale(), "#10151b");
}

function drawPipeline(x, y) {
  rectWorld(x, y, 150, 98, "#111820");
  for (let i = 0; i < 4; i += 1) {
    rectWorld(x + 18 + i * 30, y + 28 + (i % 2) * 20, 18, 18, i % 2 ? "#5aa2ff" : "#8bdc65");
    if (i < 3) rectWorld(x + 38 + i * 30, y + 36 + (i % 2) * 10, 22, 4, "#d8f77a");
  }
}

function drawPartnerPortals(x, y) {
  ["GitHub", "AWS", "MSFT"].forEach((label, i) => {
    rectWorld(x, y + i * 40, 160, 30, "#e9edf1");
    text(label, toScreenX(x + 18), toScreenY(y + 21 + i * 40), 14 * currentScale(), "#17202b");
  });
}

function drawAiRobotBackend(x, y) {
  const now = performance.now();
  const pulse = Math.floor(now / 170) % 4;
  const piston = pulse % 2;
  const eyeColor = pulse === 0 ? "#f4e500" : "#fff200";
  const cream = "#f4f0d0";
  const gray = "#b9b9b6";
  const grayMid = "#8e8f8d";
  const grayDark = "#454545";
  const black = "#050607";

  drawRepoCloud(x + 292, y - 58, "AWS", "#f8a21a", 0.82);
  drawRepoCloud(x + 426, y - 20, "Microsoft", "#4f7bd9", 0.78);
  drawGitHubContainer(x + 318, y + 142);

  drawPixelCable(x + 318, y + 162, x + 242, y + 124, "#5aa2ff");
  drawPixelCable(x + 236, y + 62, x + 326, y - 20, "#f8a21a");
  drawPixelCable(x + 232, y + 92, x + 466, y + 20, "#4f7bd9");

  drawGeneratorSmoke(x + 82, y - 14, now);
  drawGeneratorDust(x + 38, y + 202, now);
  drawGeneratorDust(x + 260, y + 204, now + 640);

  rectWorld(x + 6, y + 208, 286, 10, "rgba(16,18,22,.22)");
  rectWorld(x + 18, y + 188, 246, 26, black);
  rectWorld(x + 30, y + 192, 222, 18, "#6d6e6c");
  rectWorld(x + 52, y + 196, 64, 8, "#8e8f8d");
  rectWorld(x + 142, y + 196, 86, 8, "#8e8f8d");

  rectWorld(x + 62, y - 12, 52, 14, black);
  rectWorld(x + 78, y - 24, 24, 16, "#c8c8c6");
  rectWorld(x + 106, y - 16, 36, 16, "#a7a7a4");
  rectWorld(x + 224, y - 24, 64, 14, black);
  rectWorld(x + 234, y - 18, 52, 10, "#c8c8c6");

  rectWorld(x + 28, y + 4, 236, 178, black);
  rectWorld(x + 40, y + 16, 174, 162, gray);
  rectWorld(x + 214, y + 18, 42, 158, grayMid);
  rectWorld(x + 248, y + 22, 16, 150, black);
  rectWorld(x + 48, y + 24, 16, 98, cream);
  rectWorld(x + 50, y + 130, 28, 14, gray);
  rectWorld(x + 76, y + 28, 122, 8, "#626260");
  rectWorld(x + 76, y + 164, 100, 8, "#626260");

  rectWorld(x + 92, y + 58, 92, 78, "#6f706e");
  rectWorld(x + 118, y + 54, 32, 34, "#5a5b59");
  rectWorld(x + 130, y + 66, 38, 38, black);
  rectWorld(x + 148, y + 84, 14, 14, "#e12222");
  rectWorld(x + 134, y + 104 + piston * 6, 14, 28, "#3f403e");
  rectWorld(x + 156, y + 98 + piston * 6, 12, 30, black);

  rectWorld(x + 104, y + 138, 72, 52, "#5a76ba");
  rectWorld(x + 124, y + 148, 32, 9, grayDark);
  rectWorld(x + 124, y + 164, 34, 9, grayDark);
  rectWorld(x + 124, y + 180, 34, 8, grayDark);
  rectWorld(x + 110, y + 196, 46, 8, black);

  drawMachineFlywheel(x + 254, y + 184, pulse);
  rectWorld(x + 260, y + 208, 150, 8, black);
  rectWorld(x + 22, y + 216, 34, 10, black);
  rectWorld(x + 126, y + 216, 48, 10, black);
  rectWorld(x + 224, y + 216, 42, 10, black);
}

function drawMachineFlywheel(x, y, phase) {
  const rim = phase % 2 ? "#8e8f8d" : "#b9b9b6";
  rectWorld(x - 18, y - 12, 36, 24, "#050607");
  rectWorld(x - 22, y - 6, 44, 12, "#050607");
  rectWorld(x - 12, y - 18, 24, 36, "#050607");
  rectWorld(x - 12, y - 8, 24, 16, rim);
  rectWorld(x - 8, y - 12, 16, 24, rim);
  rectWorld(x - 5, y - 5, 10, 10, "#454545");
  if (phase % 2) {
    rectWorld(x - 18, y - 2, 36, 4, "#6d6e6c");
    rectWorld(x - 2, y - 16, 4, 32, "#6d6e6c");
  } else {
    rectWorld(x - 12, y - 12, 8, 8, "#6d6e6c");
    rectWorld(x + 4, y - 12, 8, 8, "#6d6e6c");
    rectWorld(x - 12, y + 4, 8, 8, "#6d6e6c");
    rectWorld(x + 4, y + 4, 8, 8, "#6d6e6c");
  }
}

function drawGeneratorSmoke(x, y, now) {
  const cycle = (now * 0.00042) % 1;
  for (let i = 0; i < 4; i += 1) {
    const t = (cycle + i * 0.26) % 1;
    if (t > 0.72) continue;
    const alpha = 0.24 * (1 - t / 0.72);
    const sx = x + i * 8 + t * 38;
    const sy = y - t * 58 - i * 4;
    rectWorld(sx, sy, 16 + i * 2, 9 + i, `rgba(164,166,162,${alpha})`);
    rectWorld(sx + 8, sy - 7, 12 + i * 2, 8 + i, `rgba(205,207,202,${alpha * 0.85})`);
  }
}

function drawGeneratorDust(x, y, now) {
  const cycle = (now * 0.00055) % 1;
  if (cycle > 0.48) return;
  for (let i = 0; i < 3; i += 1) {
    const t = cycle + i * 0.08;
    const alpha = 0.18 * (1 - t / 0.72);
    rectWorld(x + i * 18 + t * 20, y - i * 3, 22 - i * 4, 8, `rgba(143,143,132,${alpha})`);
  }
}

function drawRepoCloud(x, y, label, color, size = 1) {
  const s = size;
  rectWorld(x, y + 26 * s, 118 * s, 22 * s, "rgba(255,255,255,.72)");
  rectWorld(x + 16 * s, y + 10 * s, 40 * s, 38 * s, "rgba(255,255,255,.82)");
  rectWorld(x + 48 * s, y, 54 * s, 54 * s, "rgba(255,255,255,.86)");
  rectWorld(x + 94 * s, y + 16 * s, 42 * s, 32 * s, "rgba(255,255,255,.72)");
  rectWorld(x + 16 * s, y + 48 * s, 104 * s, 6 * s, "rgba(189,220,229,.48)");
  centeredWorldText(label, x, y + 22 * s, 136 * s, 24 * s, 13 * s, color);
}

function drawGitHubContainer(x, y) {
  rectWorld(x + 4, y + 52, 92, 8, "rgba(16,18,22,.2)");
  rectWorld(x, y, 94, 52, "#10151b");
  rectWorld(x + 6, y + 6, 82, 40, "#2f333a");
  rectWorld(x + 10, y + 10, 74, 8, "#4a4f57");
  rectWorld(x + 10, y + 34, 74, 6, "#1d2026");
  for (let i = 0; i < 5; i += 1) {
    rectWorld(x + 14 + i * 14, y + 18, 5, 18, i % 2 ? "#555b64" : "#6a717c");
  }
  centeredWorldText("GitHub", x + 8, y + 18, 78, 20, 11, "#f4efe5");
  rectWorld(x - 10, y + 22, 12, 10, "#10151b");
  rectWorld(x - 8, y + 24, 8, 6, "#5aa2ff");
}

function drawRepoInput(x, y, label, accent) {
  rectWorld(x, y, 128, 38, "#10151b");
  rectWorld(x + 6, y + 6, 116, 26, "#f4efe5");
  rectWorld(x + 14, y + 12, 20, 14, "#d9e5ff");
  rectWorld(x + 14, y + 8, 16, 6, "#d9e5ff");
  rectWorld(x + 36, y + 17, 66, 4, accent);
  rectWorld(x + 36, y + 25, 46, 3, "#5f6b73");
  text(label, toScreenX(x + 44), toScreenY(y + 15), 10 * currentScale(), "#17202b");
}

function drawPixelCable(x1, y1, x2, y2, color) {
  const midX = x1 + (x2 - x1) * 0.45;
  const cableDark = "#10151b";
  rectWorld(Math.min(x1, midX), y1, Math.abs(x1 - midX) + 4, 6, cableDark);
  rectWorld(midX, Math.min(y1, y2), 6, Math.abs(y2 - y1) + 6, cableDark);
  rectWorld(Math.min(midX, x2), y2, Math.abs(midX - x2) + 6, 6, cableDark);
  rectWorld(Math.min(x1, midX), y1 + 1, Math.abs(x1 - midX) + 4, 3, color);
  rectWorld(midX + 1, Math.min(y1, y2), 3, Math.abs(y2 - y1) + 4, color);
  rectWorld(Math.min(midX, x2), y2 + 1, Math.abs(midX - x2) + 4, 3, color);
  rectWorld(x2 - 4, y2 - 4, 10, 10, "#10151b");
  rectWorld(x2 - 1, y2 - 1, 4, 4, color);
  drawCablePackets(x1, y1, midX, y1, midX, y2, x2, y2, color);
}

function drawCablePackets(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  const route = [
    [x1, y1, x2, y2],
    [x2, y2, x3, y3],
    [x3, y3, x4, y4]
  ];
  const lengths = route.map(([sx, sy, ex, ey]) => Math.abs(ex - sx) + Math.abs(ey - sy));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const seed = ((x1 + y1 + x4 + y4) % 97) / 97;
  const drift = (performance.now() * 0.0014 + seed) % 1;
  for (let packet = 0; packet < 4; packet += 1) {
    let distance = ((drift + packet * 0.25) % 1) * total;
    let px = x1;
    let py = y1;
    for (let index = 0; index < route.length; index += 1) {
      const [sx, sy, ex, ey] = route[index];
      const length = lengths[index];
      if (distance <= length) {
        const t = length === 0 ? 0 : distance / length;
        px = sx + (ex - sx) * t;
        py = sy + (ey - sy) * t;
        break;
      }
      distance -= length;
    }
    rectWorld(px - 4, py - 4, 10, 10, "#f4efe5");
    rectWorld(px - 2, py - 2, 6, 6, color);
  }
}

function drawNext(left) {
  drawMountainBackdrop(left);
  drawBrook(left + 68, world.ground + 8);
  drawWaterfall(left + 716, world.ground - 150);
  drawSignpost(left + 512, world.ground - 260);
}

function drawUnknown(left) {
  drawMountainBackdrop(left);
  drawBrook(left - 210, world.ground + 8);
  for (let i = 0; i < 9; i += 1) {
    drawBrookRock(left + 90 + i * 92, world.ground + 20 + (i % 3) * 4, 22 + (i % 3) * 8, 8 + (i % 2) * 5, i);
  }
}

function drawTrail(x, y) {
  for (let i = 0; i < 10; i += 1) rectWorld(x + i * 72, y + (i % 2) * 12, 42, 12, "#8b7a55");
}

function drawSignpost(x, y) {
  const postX = 118;
  rectWorld(x + postX, y + 30, 16, world.ground + 10 - (y + 30), "#6b4931");
  rectWorld(x + postX + 4, y + 30, 6, world.ground + 10 - (y + 30), "#93633d");
  const signs = [
    ["Sales", 0, 122, -1],
    ["Partner", 46, 146, 1],
    ["Strategy", 92, 154, -1],
    ["Operations", 138, 166, 1],
    ["Chief of Staff", 184, 186, -1]
  ];
  signs.forEach(([label, sy, width, dir], index) => {
    const attach = 8;
    const sx = dir < 0 ? postX - width + attach : postX + 16 - attach;
    const boardWidth = width + attach;
    rectWorld(x + sx, y + sy, boardWidth, 28, "#e1d2a8");
    rectWorld(x + sx, y + sy + 4, boardWidth, 4, "rgba(255,255,255,.24)");
    rectWorld(x + sx, y + sy + 24, boardWidth, 4, "rgba(67,42,25,.18)");
    if (dir < 0) {
      rectWorld(x + sx - 12, y + sy + 9, 12, 10, "#e1d2a8");
      rectWorld(x + sx - 6, y + sy + 5, 6, 18, "#e1d2a8");
    } else {
      rectWorld(x + sx + boardWidth, y + sy + 9, 12, 10, "#e1d2a8");
      rectWorld(x + sx + boardWidth, y + sy + 5, 6, 18, "#e1d2a8");
    }
    centeredWorldText(label, x + sx, y + sy, boardWidth, 28, index === 4 ? 11 : 13, "#27231b");
  });
}

function drawMountainBackdrop(left) {
  rectWorld(left + 18, world.ground + 2, world.sceneWidth - 36, 18, "rgba(127,149,100,.18)");
  const trees = [
    [36, 58, 0.82], [82, 70, 0.9], [126, 76, 0.8], [174, 82, 0.94],
    [222, 70, 0.84], [274, 88, 0.92], [332, 76, 0.78], [386, 90, 0.88],
    [446, 82, 0.82], [506, 94, 0.94], [566, 78, 0.8], [624, 92, 0.88],
    [684, 86, 0.78], [742, 96, 0.9], [804, 84, 0.82], [858, 92, 0.76],
    [894, 74, 0.7], [928, 88, 0.78], [956, 68, 0.66]
  ];
  trees.forEach(([tx, h, s], index) => drawFaintAlpinePine(left + tx, world.ground + 8, h, s, index));
}

function drawFaintAlpinePine(x, baseY, height, size, seed) {
  const trunk = seed % 2 ? "rgba(93,112,86,.24)" : "rgba(78,100,78,.22)";
  const pine = seed % 2 ? "rgba(77,101,73,.28)" : "rgba(88,114,82,.24)";
  const pineDark = seed % 2 ? "rgba(28,73,55,.26)" : "rgba(37,82,58,.22)";
  const pineLight = "rgba(139,196,106,.16)";
  const shadow = "rgba(50,75,56,.16)";
  const s = size;
  const topY = baseY - height;
  rectWorld(x - 3 * s, topY + 34 * s, 6 * s, height - 30 * s, trunk);
  rectWorld(x - 22 * s, baseY - 4 * s, 44 * s, 4 * s, "rgba(96,154,88,.24)");
  const tiers = [
    [0.04, 10, 16],
    [0.2, 14, 34],
    [0.38, 16, 50],
    [0.56, 18, 66],
    [0.72, 20, 80]
  ];
  tiers.forEach(([ratio, branchH, branchW], tier) => {
    const h = branchH * s;
    const ty = topY + ratio * (height - h - 2);
    rectWorld(x - (branchW / 2) * s, ty + h * 0.54, branchW * s, 7 * s, pineDark);
    rectWorld(x - (branchW / 2 - 5) * s, ty, (branchW - 10) * s, h, pine);
    rectWorld(x - (branchW / 4) * s, ty + 3 * s, (branchW / 2) * s, 5 * s, pineLight);
    if (tier > 1) rectWorld(x - (branchW / 2 + 10) * s, ty + h * 0.56, 12 * s, 6 * s, pineDark);
    if (tier > 1) rectWorld(x + (branchW / 2 - 2) * s, ty + h * 0.56, 12 * s, 6 * s, pineDark);
  });
  rectWorld(x - 28 * s, baseY - 12 * s, 56 * s, 10 * s, shadow);
}

function drawBrook(x, y) {
  const shimmer = Math.floor(performance.now() / 260) % 3;
  const flow = (performance.now() * 0.026) % 690;
  rectWorld(x, y - 2, 746, 38, "#3f7d45");
  rectWorld(x + 10, y + 4, 728, 28, "#6f918d");
  rectWorld(x + 24, y + 7, 700, 22, "#7bc6e8");
  rectWorld(x + 48, y + 11, 652, 14, "#9bd4e8");
  rectWorld(x + 134, y + 15, 430, 6, "#c1ddd5");
  rectWorld(x - 10, y + 32, 770, 10, "#4f8a3f");
  for (let i = 0; i < 12; i += 1) {
    const ox = 690 - ((flow + i * 58) % 690);
    rectWorld(x + 32 + ox, y + 12 + (i % 2) * 8, 28, 3, i % 3 === shimmer ? "#f4efe5" : "#d9eef0");
  }
  [
    [24, 1, 28, 10], [104, 27, 38, 10], [198, 2, 32, 10],
    [496, 28, 42, 10], [622, 3, 36, 10], [700, 22, 30, 10]
  ].forEach(([rx, ry, rw, rh], index) => drawBrookRock(x + rx, y + ry, rw, rh, index));
  [
    [58, -3, 32, 14], [132, -5, 44, 15], [244, -2, 28, 12],
    [330, 29, 54, 13], [426, -4, 36, 13], [548, 30, 46, 12],
    [642, -3, 52, 15], [736, 28, 32, 11]
  ].forEach(([rx, ry, rw, rh], index) => drawBrookRock(x + rx, y + ry, rw, rh, index + 7));
  drawJumpingTrout(x + 358, y + 15, 0.72);
  drawJumpingTrout(x + 584, y + 16, 0.58);
}

function drawBrookRock(x, y, width, height, seed) {
  const color = seed % 2 ? "#8f8f84" : "#7c8781";
  rectWorld(x, y + height * 0.34, width, height * 0.54, color);
  rectWorld(x + width * 0.18, y, width * 0.62, height * 0.45, "#a7aa9c");
  rectWorld(x + width * 0.2, y + height * 0.22, width * 0.42, 3, "rgba(255,255,255,.28)");
}

function drawWaterfall(x, y) {
  const fall = (performance.now() * 0.045) % 92;
  rectWorld(x - 36, y + 74, 204, 78, "#5f704f");
  rectWorld(x - 18, y + 54, 170, 36, "#7c8781");
  rectWorld(x + 12, y + 24, 112, 118, "#9bd4e8");
  rectWorld(x + 30, y + 28, 28, 112, "#d9eef0");
  rectWorld(x + 84, y + 30, 24, 104, "#c1ddd5");
  for (let i = 0; i < 6; i += 1) {
    const sy = y + 28 + ((fall + i * 18) % 92);
    rectWorld(x + 30 + (i % 3) * 26, sy, 12, 22, i % 2 ? "#d9eef0" : "#f4efe5");
  }
  rectWorld(x, y + 132, 138, 18, "#f4efe5");
  rectWorld(x - 16, y + 142, 176, 18, "#94b9b4");
  rectWorld(x - 14, y + 156, 154, 16, "#7bc6e8");
  rectWorld(x - 28, y + 168, 126, 6, "#9bd4e8");
}

function drawJumpingTrout(x, y, size = 1) {
  const s = size;
  const bob = Math.sin(performance.now() * 0.004 + x) * 2 * s;
  rectWorld(x, y + bob, 28 * s, 7 * s, "#6f8d9c");
  rectWorld(x + 6 * s, y - 4 * s + bob, 16 * s, 4 * s, "#8fb0bc");
  rectWorld(x - 5 * s, y + 1 * s + bob, 8 * s, 6 * s, "#587a8a");
  rectWorld(x + 24 * s, y + 1 * s + bob, 8 * s, 5 * s, "#587a8a");
  rectWorld(x + 8 * s, y + 4 * s + bob, 14 * s, 2 * s, "#e17a8d");
  rectWorld(x + 23 * s, y + 1 * s + bob, 2 * s, 2 * s, "#26313a");
}

function drawLeaningMountainBike(x, y) {
  drawBikeWheel(x + 16, y + 38, 15);
  drawBikeWheel(x + 72, y + 34, 15);
  drawSteppedLine(x + 28, y + 36, x + 50, y + 12, "#26313d", 3);
  drawSteppedLine(x + 50, y + 12, x + 70, y + 34, "#26313d", 3);
  drawSteppedLine(x + 28, y + 36, x + 70, y + 34, "#26313d", 3);
  drawSteppedLine(x + 50, y + 12, x + 42, y + 34, "#4f7bd9", 3);
  drawSteppedLine(x + 70, y + 34, x + 92, y - 2, "#26313d", 3);
  rectWorld(x + 48, y + 4, 20, 4, "#10151b");
  rectWorld(x + 86, y - 6, 22, 4, "#10151b");
}

function drawMountainBike(x, y) {
  drawBikeWheel(x + 12, y + 38, 18);
  drawBikeWheel(x + 78, y + 38, 18);
  drawSteppedLine(x + 30, y + 36, x + 52, y + 12, "#26313d", 3);
  drawSteppedLine(x + 52, y + 12, x + 72, y + 36, "#26313d", 3);
  drawSteppedLine(x + 30, y + 36, x + 72, y + 36, "#26313d", 3);
  drawSteppedLine(x + 52, y + 12, x + 42, y + 36, "#4f7bd9", 3);
  rectWorld(x + 48, y + 5, 22, 4, "#10151b");
  rectWorld(x + 70, y + 12, 22, 4, "#10151b");
  rectWorld(x + 88, y + 8, 4, 12, "#10151b");
}

function drawBikeWheel(x, y, radius) {
  rectWorld(x - radius, y - 2, radius * 2, 4, "#10151b");
  rectWorld(x - radius + 2, y - radius, 4, radius * 2, "#10151b");
  rectWorld(x + radius - 6, y - radius, 4, radius * 2, "#10151b");
  rectWorld(x - radius + 4, y + radius - 4, radius * 2 - 8, 4, "#10151b");
  rectWorld(x - 2, y - 2, 4, 4, "#8fa1a3");
}

function drawArtifact(scene, x, y) {
  if (scene.artifact === "Toolbox") {
    rectWorld(x, y, 86, 44, "#8a4f33");
    rectWorld(x + 24, y - 14, 38, 16, "#8a4f33");
    rectWorld(x + 14, y + 18, 58, 6, "#e8c872");
  } else if (scene.artifact === "Compass") {
    rectWorld(x + 24, y - 4, 52, 52, "#d9c89a");
    rectWorld(x + 42, y + 14, 16, 24, "#524737");
  } else if (scene.artifact.includes("chart") || scene.artifact.includes("dashboard")) {
    drawDashboard(x - 30, y - 56, scene.artifact);
  } else if (scene.artifact.includes("briefcase")) {
    rectWorld(x, y, 86, 54, "#6b4931");
    rectWorld(x + 26, y - 14, 34, 16, "#6b4931");
    rectWorld(x + 12, y + 18, 62, 6, "#d1b177");
  } else {
    rectWorld(x, y, 96, 54, "#f4e2af");
    rectWorld(x + 14, y + 16, 68, 6, "#3d4a55");
    rectWorld(x + 14, y + 30, 48, 6, "#3d4a55");
  }
}

function drawBeaver() {
  const scale = currentScale();
  const x = toScreenX(player.x);
  const walkSurface = world.ground + 48;
  const y = toScreenY(player.y + 8) + 53 * scale;
  const flip = player.facing;
  const outfit = scenes[activeScene].outfit;
  const slap = player.tailTimer > 0;
  const bob = player.grounded ? Math.sin(player.step) * Math.min(3, Math.abs(player.vx) * 0.25) : 0;
  const u = 4.2 * scale;

  fillRect(x - 34 * scale, toScreenY(walkSurface) - 5 * scale, 68 * scale, 9 * scale, "rgba(0,0,0,.22)");

  ctx.save();
  ctx.translate(px(x), px(y + bob * scale));
  ctx.scale(flip, 1);

  const p = (gx, gy, gw, gh, color) => fillRect(gx * u, gy * u, gw * u, gh * u, color);

  if (slap) {
    p(-7, -8, 2, 3, "#24150d");
    p(-15, -8, 8, 5, "#24150d");
    p(-14, -7, 6, 4, "#6b4228");
    p(-13, -6, 4, 3, "#9c6b42");
    p(-15, -4, 8, 1, "#3e2417");
  } else {
    p(-7, -11, 2, 4, "#24150d");
    p(-14, -14, 8, 7, "#24150d");
    p(-13, -13, 6, 5, "#6b4228");
    p(-12, -12, 4, 4, "#9c6b42");
    p(-14, -8, 3, 1, "#3e2417");
  }

  p(-6, -22, 10, 17, "#24150d");
  p(-5, -23, 9, 4, "#24150d");
  p(-5, -21, 9, 16, "#8f592f");
  p(-4, -20, 6, 13, "#b9763d");
  p(1, -19, 2, 11, "#d0904a");
  if (outfit !== "law") {
    p(-5, -32, 3, 4, "#24150d");
    p(1, -32, 3, 4, "#24150d");
    p(-4, -31, 2, 3, "#7b4928");
    p(1, -31, 2, 3, "#7b4928");
  }
  p(-4, -30, 8, 8, "#24150d");
  p(-3, -31, 6, 2, "#24150d");
  p(-3, -29, 7, 7, "#a56636");
  p(-2, -28, 4, 6, "#c47d3f");
  p(2, -27, 1, 1, "#101010");
  p(4, -26, 2, 2, "#24150d");
  p(3, -25, 1, 1, "#f4efe5");
  p(-1, -24, 2, 3, "#f0d2a1");
  p(-1, -23, 1, 3, "#ffffff");
  p(-5, -14, 2, 5, "#5a341f");
  p(2, -14, 2, 5, "#5a341f");
  p(-6, -5, 3, 2, "#e6c07c");
  p(2, -5, 3, 2, "#e6c07c");
  p(-6, -4, 2, 1, "#24150d");
  p(3, -4, 2, 1, "#24150d");

  drawOutfit(outfit, scale, p, u);
  drawArms(outfit, p);

  ctx.restore();
}

function drawArms(outfit, p) {
  if (outfit === "remote") {
    p(-7, -18, 3, 4, "#f8f7ef");
    p(4, -18, 3, 4, "#f8f7ef");
    p(-6, -14, 2, 4, "#7c4a29");
    p(5, -14, 2, 4, "#7c4a29");
    p(-7, -11, 2, 2, "#24150d");
    p(6, -11, 2, 2, "#24150d");
    return;
  }
  if (outfit === "traveler") {
    p(-8, -20, 3, 5, "#1e2b42");
    p(5, -20, 3, 5, "#1e2b42");
    p(-8, -16, 2, 6, "#7c4a29");
    p(6, -16, 2, 6, "#7c4a29");
    p(-9, -11, 2, 2, "#24150d");
    p(7, -11, 2, 2, "#24150d");
    p(-12, -10, 5, 2, "#10151b");
    p(-14, -7, 10, 7, "#0d1015");
    p(-13, -6, 8, 5, "#1a1d24");
    p(-12, -5, 6, 2, "#2c3038");
    p(-13, -2, 8, 1, "#3a3f48");
    p(-11, -10, 3, 1, "#2c3038");
    return;
  }
  const sleeve = outfit === "tulane" ? "#e3e3dc" : outfit === "professional" ? "#111318" : outfit === "vest" ? "#26313d" : outfit === "law" ? "#15171c" : outfit === "redhat" ? "#111318" : null;
  if (sleeve) {
    if (outfit === "tulane") {
      p(-8, -22, 3, 6, "#e3e3dc");
      p(5, -22, 3, 6, "#e3e3dc");
      p(-8, -17, 2, 5, "#7c4a29");
      p(6, -17, 2, 5, "#7c4a29");
      p(-8, -12, 2, 2, "#24150d");
      p(6, -12, 2, 2, "#24150d");
      return;
    }
    if (outfit === "law") {
      p(-9, -22, 4, 10, "#15171c");
      p(5, -22, 4, 10, "#15171c");
      p(-8, -14, 3, 5, "#1b2030");
      p(6, -14, 3, 5, "#1b2030");
      p(-8, -10, 2, 2, "#24150d");
      p(6, -10, 2, 2, "#24150d");
      return;
    }
    if (outfit === "redhat") {
      p(-8, -20, 3, 5, sleeve);
      p(5, -20, 3, 5, sleeve);
      p(-8, -16, 2, 5, "#7c4a29");
      p(6, -16, 2, 5, "#7c4a29");
      p(-9, -12, 2, 2, "#24150d");
      p(7, -12, 2, 2, "#24150d");
      return;
    }
    if (outfit === "vest") {
      p(-8, -21, 3, 2, "#26313d");
      p(5, -21, 3, 2, "#26313d");
      p(-8, -19, 3, 7, "#f7f7ef");
      p(5, -19, 3, 7, "#f7f7ef");
      p(-7, -17, 2, 1, "#d8d8cf");
      p(6, -17, 2, 1, "#d8d8cf");
      p(-7, -13, 2, 2, "#7c4a29");
      p(6, -13, 2, 2, "#7c4a29");
      p(-8, -12, 2, 2, "#24150d");
      p(7, -12, 2, 2, "#24150d");
      return;
    }
    p(-7, -18, 2, 3, sleeve);
    p(4, -18, 2, 3, sleeve);
    p(-7, -15, 2, 6, "#7c4a29");
    p(5, -15, 2, 6, "#7c4a29");
    p(-8, -10, 2, 2, "#24150d");
    p(6, -10, 2, 2, "#24150d");
    return;
  }
  p(-6, -16, 2, 7, "#7c4a29");
  p(3, -16, 2, 7, "#7c4a29");
  p(-6, -10, 2, 2, "#24150d");
  p(4, -10, 2, 2, "#24150d");
}

function drawOutfit(outfit, scale, pixel, unit) {
  const p = pixel || ((gx, gy, gw, gh, color) => fillRect(gx * unit, gy * unit, gw * unit, gh * unit, color));
  if (outfit === "plain") return;
  if (outfit === "tulane") {
    p(-8, -23, 15, 4, "#e3e3dc");
    p(-7, -21, 13, 12, "#e3e3dc");
    p(-4, -22, 7, 3, "#f0efe8");
    p(-5, -18, 9, 1, "#f7f7f0");
    p(-5, -10, 9, 1, "#d7d7d0");
    drawMiniTulaneLogo(p);
  }
  if (outfit === "law") {
    p(-9, -23, 17, 5, "#111318");
    p(-8, -20, 15, 15, "#111318");
    p(-8, -21, 5, 14, "#1b2030");
    p(4, -21, 4, 14, "#1b2030");
    p(-2, -22, 3, 16, "#214b86");
    p(-1, -21, 1, 15, "#4b78bd");
    p(-8, -33, 16, 3, "#111318");
    p(-6, -35, 12, 2, "#111318");
    p(-4, -36, 8, 2, "#111318");
    p(-1, -37, 2, 1, "#111318");
    p(4, -30, 1, 5, "#d7b24a");
    p(4, -26, 2, 1, "#d7b24a");
    p(-5, -31, 3, 1, "#111318");
    p(2, -31, 3, 1, "#111318");
    p(2, -27, 1, 1, "#101010");
    p(3, -25, 1, 1, "#f4efe5");
  }
  if (outfit === "professional") {
    p(-5, -20, 9, 10, "#111318");
    p(-2, -20, 3, 10, "#f0efe8");
    p(-1, -19, 1, 7, "#c92828");
    p(-4, -29, 8, 2, "#c92828");
  }
  if (outfit === "redhat") {
    p(-8, -21, 15, 3, "#111318");
    p(-7, -20, 13, 12, "#111318");
    p(-6, -18, 11, 10, "#171a1f");
    p(-3, -16, 5, 1, "#c92828");
    p(-2, -15, 3, 1, "#c92828");
    p(-3, -14, 5, 1, "#f4efe5");
    p(-8, -32, 16, 2, "#7c0f12");
    p(-7, -33, 14, 2, "#e2393b");
    p(-6, -34, 12, 2, "#f04b4d");
    p(-5, -35, 10, 2, "#111318");
    p(-4, -37, 8, 3, "#c92828");
    p(-9, -31, 2, 1, "#7c0f12");
    p(7, -31, 2, 1, "#7c0f12");
  }
  if (outfit === "remote") {
    p(-6, -22, 11, 13, "#ffffff");
    p(-5, -21, 9, 11, "#ffffff");
    p(-6, -22, 1, 13, "#f8f7ef");
    p(4, -22, 1, 13, "#f8f7ef");
    p(-5, -10, 9, 1, "#f8f7ef");
    p(-1, -21, 2, 1, "#f8f7ef");
    p(-2, -20, 4, 1, "#ffffff");
    p(-6, -18, 2, 2, "#f8f7ef");
    p(4, -18, 2, 2, "#f8f7ef");
    p(-6, -14, 1, 4, "#efeee7");
    p(4, -14, 1, 4, "#efeee7");
    p(-4, -9, 1, 1, "#efeee7");
    p(2, -9, 1, 1, "#efeee7");
    p(-2, -17, 1, 1, "#102f5f");
    p(-1, -17, 1, 1, "#1f4a82");
    p(1, -17, 1, 1, "#73acd6");
    p(-2, -16, 1, 1, "#1f4a82");
    p(0, -16, 1, 1, "#73acd6");
    p(-2, -15, 1, 1, "#73acd6");
    p(-1, -15, 1, 1, "#73acd6");
    p(1, -15, 1, 1, "#102f5f");
  }
  if (outfit === "vest") {
    p(-6, -21, 11, 3, "#26313d");
    p(-5, -20, 9, 11, "#f7f7ef");
    p(-6, -20, 4, 11, "#26313d");
    p(1, -20, 4, 11, "#26313d");
    p(-5, -19, 3, 1, "#3b4b5c");
    p(2, -19, 3, 1, "#3b4b5c");
    p(-5, -16, 10, 1, "#3f5062");
    p(-5, -13, 10, 1, "#3f5062");
    p(-2, -20, 1, 11, "#f7f7ef");
    p(0, -20, 1, 11, "#f7f7ef");
    p(-5, -10, 9, 3, "#3f5062");
  }
  if (outfit === "elastic") {
    p(-5, -21, 9, 2, "#10151b");
    p(-6, -20, 11, 2, "#10151b");
    p(-5, -18, 9, 8, "#10151b");
    p(-4, -10, 7, 2, "#10151b");
    p(-4, -18, 8, 7, "#10151b");
    p(-3, -17, 2, 2, "#f04e98");
    p(0, -17, 3, 3, "#f8c537");
    p(-4, -15, 3, 2, "#22a7e6");
    p(-1, -14, 4, 3, "#00bfb3");
    p(3, -14, 1, 2, "#0077c8");
    p(2, -12, 2, 1, "#8cc63f");
    p(-1, -15, 1, 1, "#f4f7fb");
    p(2, -15, 1, 1, "#f4f7fb");
    p(3, -26, 4, 1, "#10151b");
  }
  if (outfit === "traveler") {
    p(-6, -21, 11, 11, "#1e2b42");
    p(-2, -21, 3, 10, "#f1f1e8");
    p(-1, -20, 1, 8, "#2c61d6");
    p(1, -18, 2, 3, "#4f7bd9");
    p(1, -17, 1, 1, "#d9e5ff");
  }
  if (outfit === "startup") {
    p(-6, -21, 11, 11, "#1d242b");
    p(-3, -22, 6, 3, "#8bdc65");
    p(-1, -16, 2, 3, "#8bdc65");
  }
  if (outfit === "explorer") {
    p(-5, -20, 9, 9, "#789261");
    p(4, -19, 4, 8, "#594a38");
    p(-4, -29, 8, 2, "#d9c89a");
    p(-2, -24, 2, 2, "#111");
    p(1, -24, 2, 2, "#111");
  }
}

function addTailParticles() {
  for (let i = 0; i < 14; i += 1) {
    const spread = i % 7;
    particles.push({
      x: player.x - player.facing * (50 + spread * 4),
      y: world.ground + 48 - (i % 3),
      vx: -player.facing * (0.34 + spread * 0.08),
      vy: -0.18 - (i % 4) * 0.06,
      size: 4 + (i % 4) * 2,
      color: i % 3 === 0 ? "#d8c49a" : i % 3 === 1 ? "#b99164" : "#f4e3ba",
      life: 300,
      maxLife: 300
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx * dt * 0.06;
    particle.y += particle.vy * dt * 0.06;
    particle.vy += 0.08 * dt * 0.06;
    particle.life -= dt;
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
    rectWorld(particle.x, particle.y, particle.size, Math.max(3, particle.size * 0.55), fadeColor(particle.color, alpha * 0.78));
    if (particle.size > 8) {
      rectWorld(particle.x + particle.size * 0.42, particle.y - 3, particle.size * 0.6, 3, fadeColor("#fff0c8", alpha * 0.5));
    }
  });
}

function fadeColor(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function update(dt) {
  const accel = 0.76;
  const friction = 0.84;
  const maxSpeed = 5.7;

  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    player.vx += accel;
    player.facing = 1;
  }

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    player.vx -= accel;
    player.facing = -1;
  }

  if (!keys.has("ArrowRight") && !keys.has("KeyD") && !keys.has("ArrowLeft") && !keys.has("KeyA")) {
    player.vx *= friction;
  }

  player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
  player.x += player.vx * dt * 0.06;
  player.x = Math.max(70, Math.min(world.width - 120, player.x));

  player.vy += 0.62 * dt * 0.06;
  player.y += player.vy * dt * 0.06;
  if (player.y >= world.ground) {
    player.y = world.ground;
    player.vy = 0;
    player.grounded = true;
  }

  if (player.tailTimer > 0) player.tailTimer -= dt;
  player.step += Math.abs(player.vx) * dt * 0.016;
  updateParticles(dt);

  const nextScene = Math.max(0, Math.min(scenes.length - 1, Math.floor(player.x / world.sceneWidth)));
  if (nextScene !== activeScene) {
    activeScene = nextScene;
    renderPanel();
  }

  cameraX += (sceneCameraTarget(activeScene) - cameraX) * 0.085;
  syncIntroBrand();
  syncFinalOverlay();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  fillRect(0, 0, canvas.width, canvas.height, "#11141a");

  for (let i = 0; i < scenes.length; i += 1) {
    if (isIntroScene(activeScene) && i > 0) continue;
    drawScene(scenes[i], i);
  }
  for (let i = 0; i < scenes.length; i += 1) {
    if (isIntroScene(activeScene) && i > 0) continue;
    drawSceneForeground(scenes[i], i);
  }
  drawParticles();
  drawBeaver();
}

function renderPanel() {
  const scene = scenes[activeScene];
  const playableTotal = playableScenes().length;
  const intro = isIntroScene(scene);
  const outro = isOutroScene(scene);
  ui.count.textContent = intro ? `Start / ${playableTotal}` : outro ? "" : `Level ${String(playableLevelNumber(activeScene)).padStart(2, "0")} / ${playableTotal}`;
  ui.type.textContent = outro ? "" : scene.type;
  ui.capability.textContent = intro || outro ? "" : scene.capability;
  ui.capability.style.display = intro || outro ? "none" : "";
  ui.title.textContent = scene.title;
  ui.title.style.display = intro || outro ? "none" : "";
  ui.story.textContent = scene.story;
  ui.story.style.display = outro ? "none" : "";
  ui.place.textContent = scene.place;
  ui.place.style.display = intro || outro ? "none" : "";
  ui.artifact.textContent = `Capability gained: ${scene.artifact}`;
  ui.artifact.style.display = intro || outro ? "none" : "";
  ui.points.innerHTML = "";
  scene.proof.forEach((point) => {
    const li = document.createElement("li");
    li.textContent = point;
    ui.points.appendChild(li);
  });
  const activePlayableIndex = intro ? -1 : outro ? playableTotal - 1 : playableLevelNumber(activeScene) - 1;
  [...ui.timeline.querySelectorAll(".dot")].forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activePlayableIndex);
    dot.classList.toggle("is-complete", index < activePlayableIndex);
  });
  ui.prev.disabled = activeScene === 0;
  ui.next.disabled = activeScene >= lastPlayableSceneIndex();
  syncIntroBrand();
  syncFinalOverlay();
}

function buildTimeline() {
  scenes.forEach((scene, index) => {
    if (!isPlayableScene(scene)) return;
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to level ${playableLevelNumber(index)}: ${scene.capability}`);
    dot.addEventListener("click", () => goToScene(index));
    ui.timeline.appendChild(dot);
  });
}

function goToScene(index) {
  const target = Math.max(0, Math.min(scenes.length - 1, index));
  activeScene = target;
  player.x = target * world.sceneWidth + 118;
  player.y = world.ground;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  cameraX = sceneCameraTarget(target);
  renderPanel();
}

function jump() {
  if (!player.grounded) return;
  player.vy = -10.8;
  player.grounded = false;
}

function slap() {
  player.tailTimer = 260;
  addTailParticles();
}

function shouldCaptureKey(event) {
  const interactiveTags = ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"];
  return !interactiveTags.includes(event.target.tagName);
}

window.addEventListener("keydown", (event) => {
  if (!shouldCaptureKey(event)) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS"].includes(event.code)) event.preventDefault();
  if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") jump();
  if (event.code === "ArrowDown" || event.code === "KeyS") slap();
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

document.querySelectorAll(".touch-button").forEach((button) => {
  const control = button.dataset.control;
  const start = (event) => {
    event.preventDefault();
    if (event.pointerId !== undefined && button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {}
    }
    if (control === "left") keys.add("ArrowLeft");
    if (control === "right") keys.add("ArrowRight");
    if (control === "jump") jump();
    if (control === "slap") slap();
  };
  const end = () => {
    if (control === "left") keys.delete("ArrowLeft");
    if (control === "right") keys.delete("ArrowRight");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
});

document.querySelectorAll(".scene-nav, .touch-controls, .timeline, .icon-button, .touch-button, .dot, #game-canvas").forEach((control) => {
  ["contextmenu", "selectstart", "dragstart"].forEach((eventName) => {
    control.addEventListener(eventName, (event) => event.preventDefault());
  });
});

ui.prev.addEventListener("click", () => goToScene(activeScene - 1));
ui.next.addEventListener("click", () => goToScene(activeScene + 1));

ui.hudToggle.addEventListener("click", () => {
  const collapsed = ui.hud.classList.toggle("is-collapsed");
  ui.hudToggle.setAttribute("aria-expanded", String(!collapsed));
});

if (ui.email) {
  ui.email.addEventListener("click", async () => {
    const email = ["westonkdavis", "gmail", "com"].join("@").replace("@com", ".com");
    try {
      await navigator.clipboard.writeText(email);
      ui.email.textContent = "Copied";
      setTimeout(() => {
        ui.email.textContent = "Email";
      }, 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}

if (ui.finalEmail) {
  ui.finalEmail.addEventListener("click", async () => {
    const local = ["wkd415", "gameresume"].join("+");
    const domain = ["gm", "ail"].join("") + ".com";
    const email = `${local}@${domain}`;
    try {
      await navigator.clipboard.writeText(email);
      ui.finalEmail.textContent = "Copied";
      if (ui.finalStatus) ui.finalStatus.textContent = "Email copied";
      setTimeout(() => {
        ui.finalEmail.textContent = "Email";
        if (ui.finalStatus) ui.finalStatus.textContent = "";
      }, 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}

if (ui.finalPrint) {
  ui.finalPrint.addEventListener("click", () => {
    const resumeWindow = window.open("resume.html", "_blank");
    if (ui.finalStatus) ui.finalStatus.textContent = "Opening resume print view";
    if (!resumeWindow) return;
    const printResume = () => {
      try {
        resumeWindow.focus();
        resumeWindow.print();
      } catch {
        if (ui.finalStatus) ui.finalStatus.textContent = "Resume opened in a new tab";
      }
    };
    resumeWindow.addEventListener("load", printResume, { once: true });
    setTimeout(printResume, 900);
  });
}

canvas.addEventListener("pointerdown", () => {
  try {
    canvas.focus({ preventScroll: true });
  } catch {
    canvas.focus();
  }
});
window.addEventListener("resize", () => {
  resizeCanvas();
  goToScene(activeScene);
});

buildTimeline();
resizeCanvas();
renderPanel();
if (document.fonts) {
  document.fonts.ready.then(() => render());
}
requestAnimationFrame(function loop(now) {
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
});
