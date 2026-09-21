// ===== 설정 =====
var W = 160, H = 100;       // 해상도 (작을수록 빠름)
var SPEED = 3;               // 이동 속도
var FOG = 12;                // 안개 거리 (멀수록 밝음)

// ===== 맵 (16x16, 1=벽 0=빈칸) =====
var map = [
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
];
var mapSize = 16;

// ===== 플레이어 =====
var px = 8, py = 0.5;        // 위치
var dx = 0, dy = 1;          // 방향 (남쪽)
var planeX = 0.66, planeY = 0; // 카메라 시야각
var totalDist = 0;

// ===== 캔버스 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
var started = false;
var isMobile = 'ontouchstart' in window;

// ===== 입력 =====
if (isMobile) {
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        started = true;
    });
} else {
    document.addEventListener('mousedown', function() {
        if (!started) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', function() {
        started = document.pointerLockElement === canvas;
    });
}

// ===== 유틸 =====
function wrap(v) { return ((v % mapSize) + mapSize) % mapSize; }
function wallAt(x, y) { return map[wrap(y)][wrap(x)]; }

// ===== 업데이트 =====
function update(dt) {
    var nx = px + dx * SPEED * dt;
    var ny = py + dy * SPEED * dt;
    if (wallAt(Math.floor(nx), Math.floor(py)) === 0) px = nx;
    if (wallAt(Math.floor(px), Math.floor(ny)) === 0) py = ny;
    px = wrap(px);
    py = wrap(py);
    totalDist += SPEED * dt;
}

// ===== 렌더링 =====
function render() {
    // 천장
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, W, H / 2);
    // 바닥
    ctx.fillStyle = '#1a120a';
    ctx.fillRect(0, H / 2, W, H / 2);

    // 벽 (레이캐스팅)
    for (var x = 0; x < W; x++) {
        var cam = 2 * x / W - 1;
        var rx = dx + planeX * cam;
        var ry = dy + planeY * cam;

        // DDA 초기화
        var mapX = px | 0, mapY = py | 0;
        var ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry);
        var stepX, stepY, sideX, sideY;

        if (rx < 0) { stepX = -1; sideX = (px - mapX) * ddx; }
        else        { stepX = 1;  sideX = (mapX + 1 - px) * ddx; }
        if (ry < 0) { stepY = -1; sideY = (py - mapY) * ddy; }
        else        { stepY = 1;  sideY = (mapY + 1 - py) * ddy; }

        // DDA 루프: 벽 찾을때까지 한칸씩 전진
        var side, hit = 0, n = 0;
        while (hit === 0 && n < 64) {
            if (sideX < sideY) {
                sideX += ddx; mapX += stepX; side = 0;
            } else {
                sideY += ddy; mapY += stepY; side = 1;
            }
            hit = wallAt(mapX, mapY);
            n++;
        }
        if (hit === 0) continue;

        // 벽까지 거리
        var dist = side === 0
            ? (mapX - px + (1 - stepX) / 2) / rx
            : (mapY - py + (1 - stepY) / 2) / ry;

        // 벽 높이
        var h = (H / dist) | 0;
        var top = (H / 2 - h / 2) | 0;
        var bot = (H / 2 + h / 2) | 0;
        if (top < 0) top = 0;
        if (bot > H) bot = H;

        // 밝기 (거리→어둡게, 옆면→더 어둡게)
        var bright = 1 - dist / FOG;
        if (bright < 0) bright = 0;
        if (side === 1) bright *= 0.7;

        // 벽 그리기 (벽돌색)
        var r = 130 * bright | 0;
        var g = 45 * bright | 0;
        var b = 35 * bright | 0;
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x, top, 1, bot - top);
    }

    // 십자선
    ctx.fillStyle = '#fff';
    ctx.fillRect(W / 2 - 4, H / 2, 3, 1);
    ctx.fillRect(W / 2 + 2, H / 2, 3, 1);
    ctx.fillRect(W / 2, H / 2 - 4, 1, 3);
    ctx.fillRect(W / 2, H / 2 + 2, 1, 3);

    // 총 (사각형 3개)
    ctx.fillStyle = '#555';
    ctx.fillRect(W / 2 - 4, H - 25, 8, 15);
    ctx.fillStyle = '#444';
    ctx.fillRect(W / 2 - 2, H - 35, 4, 12);
    ctx.fillStyle = '#553322';
    ctx.fillRect(W / 2 - 5, H - 10, 10, 10);

    // 거리
    ctx.fillStyle = '#ff0';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(totalDist) + 'm', W - 3, 10);
    ctx.textAlign = 'left';

    // 시작 화면
    if (!started) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOOM FPS', W / 2, H / 2 - 8);
        ctx.fillStyle = '#ccc';
        ctx.font = '8px monospace';
        ctx.fillText(isMobile ? '터치하여 시작' : '클릭하여 시작', W / 2, H / 2 + 8);
        ctx.textAlign = 'left';
    }
}

// ===== 게임 루프 =====
var last = 0;
function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (started) update(dt);
    render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
