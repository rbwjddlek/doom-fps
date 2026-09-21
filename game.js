// ===== 설정 =====
var W = 320, H = 200;
var AUTO_SPEED = 3.0;
var FOG_DIST = 10;

// ===== 맵 =====
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

var markers = [];
var totalDist = 0;

// ===== 플레이어 =====
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
function wrap(v, max) { return ((v % max) + max) % max; }
function getWall(x, y) { return map[wrap(y, mapH)][wrap(x, mapW)]; }
function canWalk(x, y) { return getWall(Math.floor(x), Math.floor(y)) === 0; }

// ===== 업데이트 =====
function update(dt) {
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

// ===== 렌더링 =====
function render() {
    var MASK = TEX_SIZE - 1;

    for (var x = 0; x < W; x++) {
        var camX = 2 * x / W - 1;
        var rdx = pdx + plx * camX;
        var rdy = pdy + ply * camX;

        var mx = px | 0, my = py | 0;
        var ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        var sx, sy, sdx, sdy;

        if (rdx < 0) { sx = -1; sdx = (px - mx) * ddx; }
        else         { sx = 1;  sdx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { sy = -1; sdy = (py - my) * ddy; }
        else         { sy = 1;  sdy = (my + 1 - py) * ddy; }

        var side, wall = 0, steps = 0;
        while (wall === 0 && steps < 64) {
            if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
            else           { sdy += ddy; my += sy; side = 1; }
            wall = getWall(mx, my);
            steps++;
        }
        if (wall === 0) {
            zBuffer[x] = FOG_DIST;
            for (var y = 0; y < H; y++) {
                var i = (y * W + x) * 4;
                buf[i] = 5; buf[i+1] = 3; buf[i+2] = 10; buf[i+3] = 255;
            }
            continue;
        }

        var dist = side === 0
            ? (mx - px + (1 - sx) / 2) / rdx
            : (my - py + (1 - sy) / 2) / rdy;
        zBuffer[x] = dist;

        var lh = (H / dist) | 0;
        var top = (H / 2 - lh / 2) | 0;
        var bot = (H / 2 + lh / 2) | 0;
        var realTop = top;
        if (top < 0) top = 0;
        if (bot >= H) bot = H - 1;

        var bright = 1 - Math.min(1, dist / FOG_DIST);
        if (side === 1) bright *= 0.6;

        var wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
        wallX -= Math.floor(wallX);
        var texX = (wallX * TEX_SIZE) & MASK;
        var tex = TEX[wall];
        var texStep = TEX_SIZE / lh;
        var texPos = (top - realTop) * texStep;

        // 천장 (단색)
        for (var y = 0; y < top; y++) {
            var i = (y * W + x) * 4;
            buf[i] = 5; buf[i+1] = 3; buf[i+2] = 10; buf[i+3] = 255;
        }

        // 벽 (텍스처)
        for (var y = top; y <= bot; y++) {
            var i = (y * W + x) * 4;
            var texY = texPos & MASK;
            texPos += texStep;
            var ti = (texY * TEX_SIZE + texX) * 4;
            buf[i]   = tex[ti]   * bright | 0;
            buf[i+1] = tex[ti+1] * bright | 0;
            buf[i+2] = tex[ti+2] * bright | 0;
            buf[i+3] = 255;
        }

        // 바닥 (단색)
        for (var y = bot + 1; y < H; y++) {
            var i = (y * W + x) * 4;
            buf[i] = 15; buf[i+1] = 10; buf[i+2] = 5; buf[i+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // 십자선
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2 - 5, H/2); ctx.lineTo(W/2 - 2, H/2);
    ctx.moveTo(W/2 + 2, H/2); ctx.lineTo(W/2 + 5, H/2);
    ctx.moveTo(W/2, H/2 - 5); ctx.lineTo(W/2, H/2 - 2);
    ctx.moveTo(W/2, H/2 + 2); ctx.lineTo(W/2, H/2 + 5);
    ctx.stroke();

    // 총
    var bx = W / 2, by = H - 10;
    var rc = flashTimer > 0 ? -4 : 0;
    ctx.fillStyle = '#444';
    ctx.fillRect(bx - 6, by - 40 + rc, 12, 25);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - 3, by - 55 + rc, 6, 18);
    ctx.fillStyle = '#553322';
    ctx.fillRect(bx - 7, by - 15 + rc, 14, 18);

    // 사격 플래시
    if (flashTimer > 0) {
        ctx.fillStyle = 'rgba(255,200,50,' + (flashTimer / 6) + ')';
        ctx.beginPath();
        ctx.arc(W/2, H - 70, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // 거리
    ctx.fillStyle = '#ff0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(totalDist) + 'm', W - 5, 12);
    ctx.textAlign = 'left';

    // 시작 화면
    if (!locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f00';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM FPS', W/2, H/2 - 15);
        ctx.fillStyle = '#ccc';
        ctx.font = '10px monospace';
        ctx.fillText(isMobile ? '터치하여 시작' : '클릭하여 시작', W/2, H/2 + 10);
        ctx.textAlign = 'left';
    }
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
