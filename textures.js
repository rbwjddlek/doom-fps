// ===== 텍스처 생성기 (64x64 픽셀, RGBA) =====
var TEX_SIZE = 64;

function makeTex(fn) {
    var d = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
    for (var y = 0; y < TEX_SIZE; y++) {
        for (var x = 0; x < TEX_SIZE; x++) {
            var c = fn(x, y);
            var i = (y * TEX_SIZE + x) * 4;
            d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = 255;
        }
    }
    return d;
}

// 노이즈 헬퍼
function hash(x, y) { return ((x * 2654435761 + y * 40503) >>> 0) % 256; }

var TEX = {};

// 1: 빨간 벽돌
TEX[1] = makeTex(function(x, y) {
    var row = Math.floor(y / 16);
    var bx = (x + (row % 2) * 16) % 32;
    var by = y % 16;
    if (bx < 2 || by < 2) return [60, 55, 50];
    var n = (hash(x, y) % 24) - 12;
    return [130 + n, 45 + n / 3, 35 + n / 3];
});

// 2: 회색 석재
TEX[2] = makeTex(function(x, y) {
    var bx = x % 32, by = y % 16;
    var row = Math.floor(y / 16);
    var ox = (row % 2) * 16;
    bx = (x + ox) % 32;
    if (bx < 1 || by < 1) return [45, 45, 42];
    var n = (hash(x, y) % 20) - 10;
    var bn = (hash(Math.floor(x/8), Math.floor(y/8)) % 16) - 8;
    var base = 95 + bn + n / 2;
    return [base, base, base + 3];
});

// 3: 테크 패널 (파란 금속)
TEX[3] = makeTex(function(x, y) {
    if (x < 2 || x > 61 || y < 2 || y > 61) return [30, 35, 40];
    if (x === 2 || x === 61 || y === 2 || y === 61) return [60, 90, 110];
    if (x === 32 || y === 32) return [40, 60, 80];
    var n = (hash(x, y) % 8) - 4;
    return [38 + n, 42 + n, 55 + n];
});

// 4: 나무 판자
TEX[4] = makeTex(function(x, y) {
    var plank = Math.floor(x / 16);
    if (x % 16 < 1) return [40, 25, 12];
    var grain = Math.sin(y * 0.4 + Math.sin(x * 0.15 + plank) * 4) * 12;
    var n = (hash(x, y) % 10) - 5;
    var knot = 0;
    if (hash(x / 4 | 0, y / 4 | 0) > 248) knot = -20;
    var base = 90 + grain + n + knot;
    return [base, base * 0.55, base * 0.25];
});

// 5: 이끼 낀 돌
TEX[5] = makeTex(function(x, y) {
    var bx = x % 16, by = y % 16;
    if (bx < 1 || by < 1) return [30, 38, 28];
    var n = (hash(x, y) % 20) - 10;
    var moss = (Math.sin(x * 0.7) * Math.cos(y * 0.5) + 1) * 12;
    var base = 70 + n;
    return [base * 0.5, base + moss, base * 0.4];
});

// 6: 피 묻은 벽
TEX[6] = makeTex(function(x, y) {
    var row = Math.floor(y / 16);
    var bx = (x + (row % 2) * 16) % 32;
    var by = y % 16;
    if (bx < 2 || by < 2) return [50, 40, 35];
    var n = (hash(x, y) % 20) - 10;
    var drip = 0;
    if (x > 20 && x < 35 && y > 10) drip = Math.max(0, 30 - (y - 10) * 0.8);
    return [110 + n + drip, 35 + n / 2 - drip / 3, 30 + n / 2 - drip / 3];
});

// 바닥 텍스처
TEX.floor = makeTex(function(x, y) {
    var tile = (Math.floor(x / 32) + Math.floor(y / 32)) % 2;
    var n = (hash(x, y) % 12) - 6;
    if (tile) return [35 + n, 30 + n, 25 + n];
    return [28 + n, 24 + n, 20 + n];
});

// 천장 텍스처
TEX.ceil = makeTex(function(x, y) {
    var n = (hash(x, y) % 8) - 4;
    var panel = 0;
    if (x % 32 < 1 || y % 32 < 1) panel = 8;
    return [18 + n + panel, 16 + n + panel, 22 + n + panel];
});
