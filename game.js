// ===== 설정 =====
var W = 640, H = 480;
var AUTO_SPEED = 3.0;

// ===== 맵 (위아래가 이어지는 무한루프 복도) =====
var map = [
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
];
var mapW = map[0].length, mapH = map.length;

// 안개 거리 (멀수록 어두워짐)
var FOG_DIST = 12;

// ===== 기둥 마커 (번호 표시용) =====
var markers = [];
var totalDist = 0;

// ===== 플레이어 (아래 방향으로 자동 전진, 방향 고정) =====
var px = 8, py = 0.5;
var pdx = 0, pdy = 1;
var plx = 0.66, ply = 0;

// ===== 입력 =====
var locked = false;
var shooting = false;
var flashTimer = 0;
var isMobile = 'ontouchstart' in window;

// ===== 캔버스 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

var imgData = ctx.createImageData(W, H);
var buf = imgData.data;
var zBuffer = new Float64Array(W);

// ===== 입력 이벤트 =====
if (isMobile) {
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (!locked) { locked = true; } else { shooting = true; }
    });
} else {
    document.addEventListener('mousedown', function(e) {
        if (!locked) { canvas.requestPointerLock(); } else if (e.button === 0) { shooting = true; }
    });
    document.addEventListener('pointerlockchange', function() {
        locked = document.pointerLockElement === canvas;
    });
}

// ===== 유틸 =====
function wrap(v, max) {
    return ((v % max) + max) % max;
}

function getWall(x, y) {
    return map[wrap(y, mapH)][wrap(x, mapW)];
}

function canWalk(x, y) {
    return getWall(Math.floor(x), Math.floor(y)) === 0;
}

// ===== 업데이트 =====
function update(dt) {
    // 자동 전진 (방향 고정)
    var mx = pdx * AUTO_SPEED * dt;
    var my = pdy * AUTO_SPEED * dt;
    var r = 0.25;
    if (canWalk(px + mx + Math.sign(mx) * r, py)) px += mx;
    if (canWalk(px, py + my + Math.sign(my) * r)) py += my;

    totalDist += AUTO_SPEED * dt;

    px = wrap(px, mapW);
    py = wrap(py, mapH);

    if (shooting) { flashTimer = 6; shooting = false; }
    if (flashTimer > 0) flashTimer--;
}

// ===== 렌더링 (레이캐스팅) =====
function render() {
    for (var x = 0; x < W; x++) {
        var camX = 2 * x / W - 1;
        var rdx = pdx + plx * camX;
        var rdy = pdy + ply * camX;

        var mx = Math.floor(px), my = Math.floor(py);
        var ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        var sx, sy, sdx, sdy;

        if (rdx < 0) { sx = -1; sdx = (px - mx) * ddx; }
        else         { sx = 1;  sdx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { sy = -1; sdy = (py - my) * ddy; }
        else         { sy = 1;  sdy = (my + 1 - py) * ddy; }

        var side, wall = 0;
        while (wall === 0) {
            if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
            else           { sdy += ddy; my += sy; side = 1; }
            wall = getWall(mx, my);
        }

        var dist = side === 0
            ? (mx - px + (1 - sx) / 2) / rdx
            : (my - py + (1 - sy) / 2) / rdy;
        zBuffer[x] = dist;

        var lh = Math.floor(H / dist);
        var top = Math.floor(H / 2 - lh / 2);
        var bot = Math.floor(H / 2 + lh / 2);
        var realTop = top;
        if (top < 0) top = 0;
        if (bot >= H) bot = H - 1;

        // 안개 계수
        var fog = Math.min(1, dist / FOG_DIST);
        var bright = 1 - fog;

        // 벽 텍스처 좌표
        var wallX;
        if (side === 0) wallX = py + dist * rdy;
        else            wallX = px + dist * rdx;
        wallX -= Math.floor(wallX);
        var texX = (wallX * TEX_SIZE) & (TEX_SIZE - 1);
        var tex = TEX[wall];
        var texStep = TEX_SIZE / lh;
        var texPos = (top - realTop) * texStep;

        for (var y = 0; y < H; y++) {
            var i = (y * W + x) * 4;

            if (y < top) {
                // 천장 (어두운 그라데이션)
                var cd = y / (H * 0.5);
                buf[i] = 8 * cd | 0; buf[i+1] = 6 * cd | 0; buf[i+2] = 15 * cd | 0;
            } else if (y <= bot) {
                // 벽 (텍스처 + 안개)
                var texY = texPos & (TEX_SIZE - 1);
                texPos += texStep;
                var ti = (texY * TEX_SIZE + texX) * 4;
                var r = tex[ti], g = tex[ti+1], b = tex[ti+2];
                if (side === 1) { r >>= 1; g >>= 1; b >>= 1; }
                buf[i] = r * bright | 0;
                buf[i+1] = g * bright | 0;
                buf[i+2] = b * bright | 0;
            } else {
                // 바닥 (어두운 그라데이션)
                var fd = 1 - (y - H * 0.5) / (H * 0.5);
                buf[i] = 22 * fd | 0; buf[i+1] = 15 * fd | 0; buf[i+2] = 8 * fd | 0;
            }
            buf[i+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // 십자선
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W/2 - 10, H/2); ctx.lineTo(W/2 - 3, H/2);
    ctx.moveTo(W/2 + 3, H/2);  ctx.lineTo(W/2 + 10, H/2);
    ctx.moveTo(W/2, H/2 - 10); ctx.lineTo(W/2, H/2 - 3);
    ctx.moveTo(W/2, H/2 + 3);  ctx.lineTo(W/2, H/2 + 10);
    ctx.stroke();

    // 총
    drawGun();

    // 사격 플래시
    if (flashTimer > 0) {
        ctx.fillStyle = 'rgba(255,200,50,' + (flashTimer / 6) + ')';
        ctx.beginPath();
        ctx.arc(W/2, H - 140, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // 기둥 번호 (벽 뒤면 안 그림)
    drawMarkers();

    // 거리 표시
    ctx.fillStyle = '#ff0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(totalDist) + 'm', W - 10, 20);
    ctx.textAlign = 'left';

    // 미니맵
    drawMinimap();

    // 시작 화면
    if (!locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f00';
        ctx.font = '40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM FPS', W/2, H/2 - 30);
        ctx.fillStyle = '#ccc';
        ctx.font = '18px monospace';
        ctx.fillText(isMobile ? '터치하여 시작' : '클릭하여 시작', W/2, H/2 + 20);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('자동 전진 | 탭/클릭 사격', W/2, H/2 + 60);
        ctx.textAlign = 'left';
    }
}

function drawGun() {
    var bx = W / 2, by = H - 20;
    var recoil = flashTimer > 0 ? -8 : 0;
    ctx.fillStyle = '#444';
    ctx.fillRect(bx - 12, by - 80 + recoil, 24, 50);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - 5, by - 110 + recoil, 10, 35);
    ctx.fillStyle = '#553322';
    ctx.fillRect(bx - 14, by - 30 + recoil, 28, 35);
}

function drawMarkers() {
    var invDet = 1.0 / (plx * pdy - pdx * ply);

    for (var i = 0; i < markers.length; i++) {
        var m = markers[i];
        var dx = m.x - px;
        var dy = m.y - py;
        if (dx > mapW / 2) dx -= mapW;
        if (dx < -mapW / 2) dx += mapW;
        if (dy > mapH / 2) dy -= mapH;
        if (dy < -mapH / 2) dy += mapH;

        var tx = invDet * (pdy * dx - pdx * dy);
        var ty = invDet * (-ply * dx + plx * dy);

        if (ty <= 0.5) continue;

        var sx = Math.floor(W / 2 * (1 + tx / ty));
        if (sx < 0 || sx >= W) continue;

        // 벽 뒤면 스킵 (zBuffer 체크)
        if (ty > zBuffer[sx]) continue;

        var sy = Math.floor(H / 2 + 20 / ty);
        var size = Math.floor(150 / ty);
        if (size < 10) size = 10;
        if (size > 50) size = 50;

        ctx.fillStyle = '#ff0';
        ctx.font = 'bold ' + size + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, sx, sy);
    }
    ctx.textAlign = 'left';
}

function drawMinimap() {
    var s = 5, ox = 10, oy = 10;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(ox - 1, oy - 1, mapW * s + 2, mapH * s + 2);
    for (var y = 0; y < mapH; y++) {
        for (var x = 0; x < mapW; x++) {
            ctx.fillStyle = map[y][x] > 0 ? '#666' : '#222';
            ctx.fillRect(ox + x * s, oy + y * s, s, s);
        }
    }
    ctx.fillStyle = '#0f0';
    ctx.fillRect(ox + px * s - 1.5, oy + py * s - 1.5, 3, 3);
    ctx.globalAlpha = 1;
}

// ===== 게임 루프 =====
var lastTime = 0;
function loop(time) {
    var dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (locked) update(dt);
    render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
