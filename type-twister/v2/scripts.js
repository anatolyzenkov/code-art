// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
const colors = new Array(1000);
let rectsTester;
const DEBUG = isLocalHost();
let canvas2d;
let ctx;
let targetPoint;
let stats;
let motions;
let sizeFactor
let fontName = 'sans-serif';
let mapCanvas;
let mapCtx;
let typeTwister;
let text;
let pathLength;

const initScene = (fntName) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('t') !== null) {
        text = urlParams.get('t');
    } else {
        text = isMobileDevice() ? 'Store your data on CDs' : 'Store your data on CDs';
        
    }
    fontName = fntName;
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator(MotionSimulator.PENDULUM);
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Setup canvas
    canvas2d = getCanvas(getViewport()[0] * resolution, getViewport()[1] * resolution, 'canvas2d', ['main-canvas']);
    const onResize = () => {
        canvas2d.width = getViewport()[0] * resolution;
        canvas2d.height = getViewport()[1] * resolution;
        canvas2d.style.width = getViewport()[0] + 'px';
        canvas2d.style.height = getViewport()[1] + 'px';
        setupObjects(text);
    }
    canvas2d.style.width = getViewport()[0] + 'px';
    canvas2d.style.height = getViewport()[1] + 'px';
    ctx = canvas2d.getContext('2d');
    document.body.appendChild(canvas2d);
    // Setup events
    let timeoutID = -1;
    window.addEventListener('resize', () => {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            onResize();
        }, 300);
    });
    pathLength = 0;
    onResize();
    targetPoint = new Point(canvas2d.width/2, canvas2d.height/2);
    updateFrame();
}

const setupObjects = (text) => {
    sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
    // Setup text
    if (mapCanvas === undefined) mapCanvas = getCanvas(200, 200);
    mapCtx = mapCanvas.getContext('2d');
    const fontSize = isMobileDevice() ? 140 : 190;
    const font = '900 ' + (fontSize * resolution) + 'px ' + fontName;
    mapCtx.font = font;
    mapCtx.textBaseline = 'top';
    let textMetrics = mapCtx.measureText(text.toUpperCase());
    mapCanvas.width = textMetrics.width;
    mapCanvas.height = textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent;
    mapCtx.font = font;
    mapCtx.textBaseline = 'top';
    mapCtx.beginPath();
    const gradient = mapCtx.createLinearGradient(0, 0, mapCanvas.width, 0);
    gradient.addColorStop(0, "#ea5041");
    gradient.addColorStop(1, "#1c2068");
    mapCtx.fillStyle = gradient;
    mapCtx.fillText(text.toUpperCase(), 0, textMetrics.actualBoundingBoxAscent);
    mapCtx.stroke();
    // document.body.appendChild(mapCanvas);
    // Setup colors
    const colorGradient = getCanvas(colors.length, 100, 'canvas2d');
    const cgCtx = colorGradient.getContext('2d');
    const grd = cgCtx.createLinearGradient(0, 0, colorGradient.width, 0);
    grd.addColorStop(0, '#e9a5a5');
    grd.addColorStop(0.2, '#b8c1c0');
    grd.addColorStop(0.4, '#65c0e0');
    grd.addColorStop(0.6, '#aea2db');
    grd.addColorStop(0.8, '#81c1d9');
    grd.addColorStop(1, '#e9a5a5');
    cgCtx.fillStyle = grd;
    cgCtx.fillRect(0, 0, colorGradient.width, colorGradient.height);
    const myImageData = cgCtx.getImageData(0, 0, colors.length, 100);
    for (let i = 0; i < colors.length; i++) {
        colors[i] = '#' + (
            ((myImageData.data[i * 4]) << 16) +
            ((myImageData.data[i * 4 + 1]) << 8) +
            ((myImageData.data[i * 4 + 2]) << 0)
            ).toString(16);
        // colors[i] = getRandomColor();
    }
    // Setup geometry
    const x = canvas2d.width;
    const y = canvas2d.height;
    const length = mapCanvas.width;
    const width = mapCanvas.height;
    const scale = sizeFactor;
    typeTwister = new TypeTwister(x, y, length, width, scale);
}

class TypeTwister {
    length;
    width;
    halfWidth;
    xSegmentsCount;
    ySegmentsCount;
    segmentWidth;
    segments;
    points;
    tris;
    trisToDraw;
    debugPoints;
    limit;
    scale;
    checkedTris;
    constructor(x, y, length, width, scale) {
        if (scale === undefined) scale = 1;
        this.scale = scale;
        this.length = length * scale;
        this.width = width * scale;
        this.halfWidth = width / 2 * scale;
        const segmentWidth = isMobileDevice() ? 80 : 60;
        this.xSegmentsCount = Math.floor(this.length / segmentWidth / scale);
        this.segmentWidth = this.length/this.xSegmentsCount;
        this.ySegmentsCount = Math.round(this.width/this.segmentWidth);
        this.limit = this.segmentWidth / width / scale * 1.2;
        this.segments = [];
        this.points = [];
        this.tris = [];
        this.trisToDraw = [];
        this.debugPoints = [];
        for (let i = 0; i < this.xSegmentsCount; i++) {
            this.segments.push(new Segment(x + i * this.segmentWidth, y));
            for (let j = 0; j < this.ySegmentsCount; j++) {
                this.points.push(new Point());
            }
        }
        const stepX = 1/(this.xSegmentsCount - 1);
        const stepY = 1/(this.ySegmentsCount - 1);
        this.segments.forEach((s,i) => {
            if (i === this.segments.length - 1) return;
            const offsetX = stepX * i;
            for (let j = 0; j < this.ySegmentsCount - 1; j++) {
                const offsetY = stepY * j;
                const tri0 = new Triangle(
                    this.points[i * this.ySegmentsCount + j],
                    this.points[i * this.ySegmentsCount + j + 1],
                    this.points[(i + 1) * this.ySegmentsCount + j]
                );
                tri0.segmentID = i;
                tri0.uv0 = new Point(offsetX, offsetY);
                tri0.uv1 = new Point(offsetX, offsetY + stepY);
                tri0.uv2 = new Point(offsetX + stepX, offsetY);
                this.tris.push(tri0);
                const tri1 = new Triangle(
                    this.points[i * this.ySegmentsCount + j + 1],
                    this.points[(i + 1) * this.ySegmentsCount + j + 1],
                    this.points[(i + 1) * this.ySegmentsCount + j],
                );
                tri1.segmentID = i;
                tri1.uv0 = new Point(offsetX, offsetY + stepY);
                tri1.uv1 = new Point(offsetX + stepX, offsetY + stepY);
                tri1.uv2 = new Point(offsetX + stepX, offsetY);
                this.tris.push(tri1);
            }
        });
        this.checkedTris = 0;
        const fillRectWidth = mapCanvas.width/this.segments.length + 2;
        const fillRectHeight = mapCanvas.height/(this.ySegmentsCount - 1) + 2;
        this.tris.forEach((tri, i) => {
            tri.id = i;
            tri.uv0Optimized = Point.clone(tri.uv0);
            tri.uv0Optimized.x *= mapCanvas.width;
            tri.uv0Optimized.y *= mapCanvas.height;
            tri.uv1Optimized = Point.clone(tri.uv1);
            tri.uv1Optimized.x *= mapCanvas.width;
            tri.uv1Optimized.y *= mapCanvas.height;
            tri.uv2Optimized = Point.clone(tri.uv2);
            tri.uv2Optimized.x *= mapCanvas.width;
            tri.uv2Optimized.y *= mapCanvas.height;
            if (i % 2 === 0) {
                tri.fillRect.x = Math.max(0, tri.uv0Optimized.x - 1);
                tri.fillRect.y = Math.max(0, tri.uv0Optimized.y - 1);
            } else {
                tri.fillRect.x = Math.max(0, this.tris[i-1].uv0Optimized.x - 1);
                tri.fillRect.y = Math.max(0, this.tris[i-1].uv0Optimized.y - 1);
            }
            tri.fillRect.width = mapCanvas.width - tri.fillRect.x < fillRectWidth ? mapCanvas.width - tri.fillRect.x : fillRectWidth;
            tri.fillRect.height = mapCanvas.height - tri.fillRect.y < fillRectHeight ? mapCanvas.height - tri.fillRect.y : fillRectHeight;
        });
        this.updateGeometry = (targetX, targetY) => {
            // We do not update geometry if obect didn't moved.
            const dx = (targetX - this.segments[0].x);
            const dy = (targetY - this.segments[0].y);
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return false;
            // Update segments
            this.segments.forEach((link, i) => {
                if (i === 0) {
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const max_speed = 200 * this.scale;
                    const speed_dump = 10 * this.scale;
                    
                    const k = Math.min(max_speed, d)/d;
                    const ta = Math.atan2(dy, dx);
                    const da = deltaAngle(link.a, ta);
                    
                    link.a = ta - da * 0.8;
                    const ddx = k * d * Math.cos(link.a) / speed_dump;
                    const ddy = k * d * Math.sin(link.a) / speed_dump;
                    pathLength += Math.sqrt(ddx * ddx + ddy * ddy);
                    link.x += ddx;
                    link.y += ddy;
                } else {
                    const prev = this.segments[i - 1];
                    const a = Math.atan2(prev.y - link.y, prev.x - link.x);
                    if (i === 1) {
                        link.a = a;
                    } else {
                        const d = deltaAngle(a, prev.a);
                        const rd = Math.min(this.limit, Math.abs(d));
                        if (d > 0) {
                            link.a = prev.a - rd;
                        } else {
                            link.a = prev.a + rd;
                        }
                    }
                    link.x = prev.x - this.segmentWidth * Math.cos(link.a);
                    link.y = prev.y - this.segmentWidth * Math.sin(link.a);
                }
                if (i < this.segments.length - 1) {
                    this.tris[2 * i].a = link.a + Math.PI / 2;
                    this.tris[2 * i + 1].a = link.a - Math.PI / 2;
                }
            });
            // Update points
            this.segments.forEach((link, i) => {
                let a;
                if (i === 0) {
                    a = this.segments[i + 1].a;
                } else if (i === this.segments.length - 1) {
                    a = link.a;
                } else {
                    a = this.segments[i + 1].a + deltaAngle(this.segments[i + 1].a, link.a) / 2;
                }
                a += Math.PI / 2;
                for (let j = 0; j < this.ySegmentsCount; j ++) {
                    const p = this.points[this.ySegmentsCount * i + j];
                    const d = this.halfWidth - j * this.width / (this.ySegmentsCount-1);
                    p.x = link.x + d * Math.cos(a);
                    p.y = link.y + d * Math.sin(a);
                }
            });
            // Permanently kick out fully transparent tris
            if (this.checkedTris < this.tris.length) {
                for (let i = 0; i < 10; i++) {
                    if (this.checkedTris == this.tris.length) break;
                    testTransparency(this.tris[this.checkedTris], 1 - this.checkedTris % 2);
                    this.checkedTris ++;
                }
            }
            // Update triangles optimized
            this.trisToDraw.length = 0;
            this.debugPoints.length = 0;
            this.tris.forEach((tri, i) => {
                const p0 = tri.p0;
                const p1 = tri.p1;
                const p2 = tri.p2;
                // No transparent tris
                if (tri.invisible) return;
                // Triangle on screen test
                if (p0.x < 0 && p1.x < 0 && p2.x < 0) return;
                if (p0.y < 0 && p1.y < 0 && p2.y < 0) return;
                if (p0.x > canvas2d.width && p1.x > canvas2d.width && p2.x > canvas2d.width) return;
                if (p0.y > canvas2d.height && p1.y > canvas2d.height && p2.y > canvas2d.height) return;
                // Further geometry optimisation is possible…
                // …here
                this.trisToDraw.unshift(tri);
            });
            return true;
        }
    }
}

const testTransparency = (tri, even) => {
    let x1, y0;
    let x0 = tri.uv0Optimized.x;
    let y1 = tri.uv1Optimized.y;
    if (even) {
        x1 = tri.uv2Optimized.x;
        y0 = tri.uv0Optimized.y;
    } else {
        x1 = tri.uv1Optimized.x;
        y0 = tri.uv2Optimized.y;
    }
    const width = Math.floor(x1 - x0);
    const height = Math.floor(y1 - y0);
    const imgData = mapCtx.getImageData(x0, y0, width, height);
    for (let y = 0; y < height; y++) {
        const edge = (1 - y / height) * width;
        for (let x = 0; x < width; x++) {
            if (even) {
                if (x > edge) break;
            } else {
                if (x <= edge) continue;
            }
            if (imgData.data[4 * (y * width + x) + 3] > 0) {
                tri.invisible = false;
                return;
            }
        }
    }
    tri.invisible = true;
}
const updateFrame = () => {
    stats.begin();
    motions.update();
    targetPoint.x = motions.x * resolution;
    targetPoint.y = motions.y * resolution;
    const geometryChanged = typeTwister.updateGeometry(targetPoint.x, targetPoint.y);
    if (geometryChanged) {
        //renderFrame();
        renderFrameOptimized();
        // drawWireframe();
        // drawPoints();
        // drawTarget();
    }
    stats.end();
    requestAnimationFrame(updateFrame);
};

const renderFrameOptimized = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    rectsTester = new Array(typeTwister.segments.length);
    const pathOffset = pathLength / typeTwister.segmentWidth * 1.2;
    typeTwister.trisToDraw.forEach(tri => {
        if (rectsTester[tri.segmentID] === undefined) {
            const n = Math.floor(1000 * (typeTwister.segments.length - 1 - tri.segmentID + pathOffset)/typeTwister.segments.length * 3);
            mapCtx.fillStyle = colors[n % 1000];
            mapCtx.globalCompositeOperation = "source-atop";
            mapCtx.fillRect(tri.fillRect.x, 0, tri.fillRect.width, mapCanvas.height);
            rectsTester[tri.segmentID] = true;
        }
    });
    typeTwister.trisToDraw.forEach(tri => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tri.p0.x, tri.p0.y);
        ctx.lineTo(tri.p1.x, tri.p1.y);
        ctx.lineTo(tri.p2.x, tri.p2.y);
        ctx.closePath();
        ctx.clip();
        let a, b, c, d, e, f, g, h, i, j, k, l, m, n, denom, pDenom, m11, m12, m21, m22, dx, dy;
        a = tri.uv2Optimized.x * tri.uv1Optimized.y;
        b = tri.uv1Optimized.x * tri.uv2Optimized.y;
        c = tri.uv2Optimized.y - tri.uv1Optimized.y;
        d = tri.uv1Optimized.x - tri.uv2Optimized.x;
        denom = tri.uv0Optimized.x * c - b + a + d * tri.uv0Optimized.y;
        if (denom == 0) {
            ctx.restore();
            return;
        }
        e = tri.p2.x - tri.p1.x;
        f = tri.p1.y - tri.p2.y;
        g = tri.uv1Optimized.y * tri.p2.x;
        h = tri.uv2Optimized.y * tri.p1.x;
        i = tri.uv1Optimized.y * tri.p2.y;
        j = tri.uv1Optimized.x * tri.p2.x;
        k = tri.uv1Optimized.x * tri.p2.y;
        l = tri.uv2Optimized.y * tri.p1.y;
        m = tri.uv2Optimized.x * tri.p1.x;
        n = tri.uv2Optimized.x * tri.p1.y;
        pDenom = 1 / denom;
        m11 = -(tri.uv0Optimized.y * e - g + h + (tri.uv1Optimized.y - tri.uv2Optimized.y) * tri.p0.x) * pDenom;
        m12 = (i + tri.uv0Optimized.y * f - l + c * tri.p0.y) * pDenom;
        m21 = (tri.uv0Optimized.x * e - j + m + d * tri.p0.x) * pDenom;
        m22 = -(k + tri.uv0Optimized.x * f - n + (tri.uv2Optimized.x - tri.uv1Optimized.x) * tri.p0.y) * pDenom;
        dx = (tri.uv0Optimized.x * (h - g) + tri.uv0Optimized.y * (j - m) + (a - b) * tri.p0.x) * pDenom;
        dy = (tri.uv0Optimized.x * (l - i) + tri.uv0Optimized.y * (k - n) + (a - b) * tri.p0.y) * pDenom;
        ctx.transform(m11, m12, m21, m22, dx, dy);
        ctx.drawImage(mapCanvas,
            tri.fillRect.x, tri.fillRect.y, tri.fillRect.width, tri.fillRect.height,
            tri.fillRect.x, tri.fillRect.y, tri.fillRect.width, tri.fillRect.height);
        ctx.restore();
    });
};
const drawWireframe = () => {
    typeTwister.trisToDraw.forEach((tri, i) => {
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        tri.original.forEach((p, j) => {
            if (j === 0) {
                ctx.moveTo(p.x, p.y);
            } else{
                ctx.lineTo(p.x, p.y);
            }
        });
        ctx.closePath();
        ctx.stroke();
    });
}
const drawPoints = (points, connect) => {
    let x, y;
    ctx.fillStyle = '#FFFFFF80';
    ctx.strokeStyle = '#FFF';
    typeTwister.points.forEach(link => {
        ctx.beginPath();
        ctx.arc(link.x, link.y, 6, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        if (!connect) return;
        ctx.beginPath();
        ctx.moveTo(x || link.x, y || link.y);
        ctx.lineTo(link.x, link.y);
        ctx.stroke();
        x = link.x;
        y = link.y;
    });
}
const drawTarget = () => {
    ctx.fillStyle = '#000000'
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 10, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
}

class Segment extends Point {
    a;
    constructor(x, y) {
        super(x, y);
        this.a = Math.PI;
    }
}

class Cap extends Point {
    a0;
    a1;
    gradient;
    constructor(x, y) {
        super(x, y);
    }
}

class Triangle {
    id;
    segmentID;
    p0;
    p1;
    p2;
    uv0;
    uv1;
    uv2;
    uv0Optimized;
    uv1Optimized;
    uv2Optimized;
    fillRect;
    original;
    invisible;
    a;
    constructor(p0, p1, p2, uv0, uv1, uv2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.uv0 = uv0 || new Point(0, 0);
        this.uv1 = uv1 || new Point(1, 0);
        this.uv2 = uv2 || new Point(0, 1);
        this.original = [p0, p1, p2];
        this.fillRect = {x:0, y:0, width:10, height:10};
    }
}

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    document.fonts.ready.then(() => {
        initScene('NeueMachina');
    });
});