// ===== 설정 =====
var W = 640, H = 480;
var AUTO_SPEED = 3.0;

// ===== 맵 (위아래가 이어지는 무한루프 복도) =====
var map = [
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,0,0,0,0,2,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,3,0,0,0,0,0,0,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,4,4,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,5,0,0,0,0,0,0,5,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
];
var mapW = map[0].length, mapH = map.length;

// 벽 색상 [R, G, B]
var wallColors = [
    null,
    [180, 60, 50],
    [140, 140, 140],
    [50, 80, 140],
    [130, 90, 40],
    [60, 120, 60],
];

// ===== 기둥 마커 (번호 표시용) =====
var markers = [
    { x: 5.5,  y: 2.5,  label: '1' },
    { x: 10.5, y: 2.5,  label: '2' },
    { x: 3.5,  y: 5.5,  label: '3' },
    { x: 12.5, y: 5.5,  label: '4' },
    { x: 7.5,  y: 7.5,  label: '5' },
    { x: 8.5,  y: 7.5,  label: '6' },
    { x: 4.5,  y: 10.5, label: '7' },
    { x: 11.5, y: 10.5, label: '8' },
    { x: 3.5,  y: 13.5, label: '9' },
    { x: 12.5, y: 13.5, label: '10' },
];
var totalDist = 0;

// ===== 플레이어 (아래 방향으로 자동 전진) =====
var px = 8, py = 0.5;
var pdx = 0, pdy = 1;
var plx = 0.66, ply = 0;

// ===== 입력 =====
var mouseDX = 0;
var locked = false;
var shooting = false;
var flashTimer = 0;
var isMobile = 'ontouchstart' in window;
var touchStartX = 0;

// ===== 캔버스 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

var imgData = ctx.createImageData(W, H);
var buf = imgData.data;

// ===== 입력 이벤트 =====
if (isMobile) {
    // 모바일: 터치로 시작, 좌우 스와이프로 시점, 탭으로 사격
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (!locked) {
            locked = true;
        } else {
            touchStartX = e.touches[0].clientX;
            shooting = true;
        }
    });
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (locked && e.touches.length > 0) {
            var dx = e.touches[0].clientX - touchStartX;
            touchStartX = e.touches[0].clientX;
            mouseDX += dx;
        }
    });
} else {
    // PC: 포인터락
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

    // 자동 전진
    var mx = pdx * AUTO_SPEED * dt;
    var my = pdy * AUTO_SPEED * dt;
    var r = 0.25;
    if (canWalk(px + mx + Math.sign(mx) * r, py)) px += mx;
    if (canWalk(px, py + my + Math.sign(my) * r)) py += my;

    // 이동 거리 누적
    totalDist += AUTO_SPEED * dt;

    // 위치 래핑 (무한루프)
    px = wrap(px, mapW);
    py = wrap(py, mapH);

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
        var cr = c[0], cg = c[1], cb = c[2];
        if (side === 1) { cr >>= 1; cg >>= 1; cb >>= 1; }

        // 그리기
        for (var y = 0; y < H; y++) {
            var i = (y * W + x) * 4;
            if (y < top) {
                buf[i] = 20; buf[i+1] = 20; buf[i+2] = 35; buf[i+3] = 255;
            } else if (y <= bot) {
                buf[i] = cr; buf[i+1] = cg; buf[i+2] = cb; buf[i+3] = 255;
            } else {
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

    // 기둥 번호
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
        ctx.fillText(isMobile ? '자동 전진 | 좌우 스와이프 시점 | 탭 사격' : '자동 전진 | 마우스 시점 | 좌클릭 사격', W/2, H/2 + 60);
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
    for (var i = 0; i < markers.length; i++) {
        var m = markers[i];
        // 래핑 거리 계산
        var dx = m.x - px;
        var dy = m.y - py;
        if (dx > mapW / 2) dx -= mapW;
        if (dx < -mapW / 2) dx += mapW;
        if (dy > mapH / 2) dy -= mapH;
        if (dy < -mapH / 2) dy += mapH;

        // 카메라 공간 변환
        var invDet = 1.0 / (plx * pdy - pdx * ply);
        var tx = invDet * (pdy * dx - pdx * dy);
        var ty = invDet * (-ply * dx + plx * dy);

        if (ty <= 0.3) continue; // 뒤에 있으면 스킵

        var sx = Math.floor(W / 2 * (1 + tx / ty));
        var sy = Math.floor(H / 2 + 30 / ty);
        var size = Math.floor(200 / ty);
        if (size < 8) size = 8;
        if (size > 60) size = 60;

        if (sx > -50 && sx < W + 50) {
            ctx.fillStyle = '#ff0';
            ctx.font = size + 'px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(m.label, sx, sy);
        }
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
    // 플레이어 위치 (래핑된 좌표)
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
