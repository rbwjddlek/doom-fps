// ===== 설정 =====
var W = 640, H = 480;

// ===== 맵 (숫자 = 벽 색상, 0 = 빈공간) =====
var map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,2,0,0,0,0,3,3,3,0,0,1],
    [1,0,0,2,0,0,0,0,0,0,0,0,3,0,0,1],
    [1,0,0,2,0,0,0,0,0,0,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,4,4,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,4,4,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,5,0,0,0,0,0,0,0,0,5,0,0,1],
    [1,0,0,5,0,0,0,0,0,0,0,0,5,0,0,1],
    [1,0,0,5,5,0,0,0,0,0,0,5,5,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
var mapW = map[0].length, mapH = map.length;

// 벽 색상 [R, G, B]
var wallColors = [
    null,
    [180, 60, 50],   // 1: 빨간 벽돌
    [140, 140, 140],  // 2: 회색 돌
    [50, 80, 140],    // 3: 파란 패널
    [130, 90, 40],    // 4: 나무
    [60, 120, 60],    // 5: 이끼
];

// ===== 플레이어 =====
var px = 2.5, py = 2.5;     // 위치
var pdx = 1, pdy = 0;       // 방향 벡터
var plx = 0, ply = 0.66;    // 카메라 평면

// ===== 입력 =====
var keys = {};
var mouseDX = 0;
var locked = false;
var shooting = false;
var flashTimer = 0;

// ===== 캔버스 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

var imgData = ctx.createImageData(W, H);
var buf = imgData.data;

// ===== 입력 이벤트 =====
document.addEventListener('keydown', function(e) { keys[e.code] = true; });
document.addEventListener('keyup', function(e) { keys[e.code] = false; });
document.addEventListener('mousemove', function(e) {
    if (locked) mouseDX += e.movementX;
});
document.addEventListener('mousedown', function(e) {
    if (!locked) {
        canvas.requestPointerLock();
    } else if (e.button === 0) {
        shooting = true;
    }
});
document.addEventListener('pointerlockchange', function() {
    locked = document.pointerLockElement === canvas;
});

// ===== 유틸 =====
function getWall(x, y) {
    if (x < 0 || x >= mapW || y < 0 || y >= mapH) return 1;
    return map[y][x];
}

function canWalk(x, y) {
    return getWall(Math.floor(x), Math.floor(y)) === 0;
}

function rotate(angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    var od = pdx;
    pdx = pdx * c - pdy * s;
    pdy = od * s + pdy * c;
    var op = plx;
    plx = plx * c - ply * s;
    ply = op * s + ply * c;
}

// ===== 업데이트 =====
function update(dt) {
    // 마우스 회전
    if (mouseDX !== 0) {
        rotate(-mouseDX * 0.002);
        mouseDX = 0;
    }

    // 키보드 회전
    if (keys['ArrowLeft']) rotate(2 * dt);
    if (keys['ArrowRight']) rotate(-2 * dt);

    // 이동
    var speed = 3 * dt;
    var mx = 0, my = 0;
    if (keys['KeyW'] || keys['ArrowUp'])   { mx += pdx; my += pdy; }
    if (keys['KeyS'] || keys['ArrowDown']) { mx -= pdx; my -= pdy; }
    if (keys['KeyA']) { mx += pdy; my -= pdx; }
    if (keys['KeyD']) { mx -= pdy; my += pdx; }

    var len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
        mx = mx / len * speed;
        my = my / len * speed;
        var r = 0.25;
        if (canWalk(px + mx + Math.sign(mx) * r, py)) px += mx;
        if (canWalk(px, py + my + Math.sign(my) * r)) py += my;
    }

    // 사격 플래시
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

        // DDA
        var side, wall = 0;
        while (wall === 0) {
            if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
            else           { sdy += ddy; my += sy; side = 1; }
            wall = getWall(mx, my);
        }

        // 거리 & 높이
        var dist = side === 0
            ? (mx - px + (1 - sx) / 2) / rdx
            : (my - py + (1 - sy) / 2) / rdy;
        var lh = Math.floor(H / dist);
        var top = Math.floor(H / 2 - lh / 2);
        var bot = Math.floor(H / 2 + lh / 2);
        if (top < 0) top = 0;
        if (bot >= H) bot = H - 1;

        // 색상
        var c = wallColors[wall] || [200, 200, 200];
        var r = c[0], g = c[1], b = c[2];
        if (side === 1) { r >>= 1; g >>= 1; b >>= 1; } // 측면 어둡게

        // 그리기
        for (var y = 0; y < H; y++) {
            var i = (y * W + x) * 4;
            if (y < top) {
                // 천장
                buf[i] = 20; buf[i+1] = 20; buf[i+2] = 35; buf[i+3] = 255;
            } else if (y <= bot) {
                // 벽
                buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
            } else {
                // 바닥
                buf[i] = 50; buf[i+1] = 40; buf[i+2] = 30; buf[i+3] = 255;
            }
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

    // 미니맵
    drawMinimap();

    // 안내 (포인터락 안됐을때)
    if (!locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f00';
        ctx.font = '40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM FPS', W/2, H/2 - 30);
        ctx.fillStyle = '#ccc';
        ctx.font = '18px monospace';
        ctx.fillText('클릭하여 시작', W/2, H/2 + 20);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('WASD 이동 | 마우스 시점 | 좌클릭 사격', W/2, H/2 + 60);
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
