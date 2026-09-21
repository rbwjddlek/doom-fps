// ===== 텍스처 (32x32) =====
var TEX_SIZE = 32;
var TEX = {};

TEX[1] = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
(function() {
    var d = TEX[1];
    for (var y = 0; y < 32; y++) {
        for (var x = 0; x < 32; x++) {
            var i = (y * 32 + x) * 4;
            var row = (y >> 3);
            var bx = (x + (row & 1) * 8) & 15;
            var by = y & 7;
            var r, g, b;
            if (bx < 1 || by < 1) {
                r = 55; g = 50; b = 45;
            } else {
                var n = ((x * 17 + y * 31) & 15) - 8;
                r = 125 + n; g = 42 + (n >> 2); b = 32 + (n >> 2);
            }
            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
        }
    }
})();
