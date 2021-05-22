// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
const DEBUG = isLocalHost();
let canvas2d;
let ctx;
let targetPoint;
let stats;
let motions;
let sizeFactor
let fontName = 'sans-serif';
let textCanvas;
let typeTwister;
let text = 'Read my lips: no new taxes';


const initScene = (fntName) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('t') !== null) {
        text = urlParams.get('t');
    }
    fontName = fntName;
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator();
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
    onResize();
    targetPoint = new Point(canvas2d.width/2, canvas2d.height/2);
    updateFrame();
}

const setupObjects = (text) => {
    sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
    // Setup text
    if (textCanvas === undefined) textCanvas = getCanvas(200, 200);
    const ctx = textCanvas.getContext('2d');
    const fontSize = isMobileDevice() ? 240 : 360;
    const font = '900 ' + fontSize + 'px ' + fontName;
    ctx.font = font;
    ctx.textBaseline = 'top';
    let textMetrics = ctx.measureText(text.toUpperCase());
    textCanvas.width = textMetrics.width;
    textCanvas.height = textMetrics.fontBoundingBoxDescent;// - textMetrics,fontBoundingBoxAscent;
    // console.log(textMetrics);
    ctx.font = font;
    ctx.textBaseline = 'top';
    // document.body.appendChild(textCanvas);
    ctx.beginPath();
    // ctx.fillStyle = '#FFFF00';
    // ctx.fillRect(0,0,textCanvas.width,textCanvas.height);
    const gradient = ctx.createLinearGradient(0, 0, textCanvas.width, 0);
    gradient.addColorStop(0, "#ea5041");
    gradient.addColorStop(1, "#1c2068");
    ctx.fillStyle = gradient;
    ctx.fillText(text.toUpperCase(), 0, textMetrics.actualBoundingBoxAscent);
    ctx.stroke();
    // Setup geometry
    const x = canvas2d.width;
    const y = canvas2d.height;
    const length = textCanvas.width;
    const width = textCanvas.height;
    const scale = resolution * sizeFactor;
    typeTwister = new TypeTwister(x, y, length, width, scale);
    console.log('resize');
}

class TypeTwister {
    length;
    width;
    halfWidth;
    segmentsCount;
    segments;
    points;
    tris;
    trisToDraw;
    debugPoints;
    limit;
    constructor(x, y, length, width, scale) {
        if (scale === undefined) scale = 1;
        this.length = length * scale;
        this.width = width * scale;
        this.halfWidth = width / 2 * scale;
        const segmentWidth = isMobileDevice() ? 20 : 10;
        this.segmentsCount = Math.floor(this.length / segmentWidth / scale);
        this.segmentWidth = this.length/this.segmentsCount;
        this.limit = this.segmentWidth / width / scale * 2;
        this.segments = [];
        this.points = [];
        this.tris = [];
        this.trisToDraw = [];
        this.debugPoints = [];
        for (let i = 0; i < this.segmentsCount; i++) {
            this.segments.push(new Link(x + i * this.segmentWidth, y));
            this.points.push(new Point(), new Point());
        }
        this.points.every((p, i) => {
            const step = 1/(this.segmentsCount - 1);
            const offset = step * Math.floor(i / 2);
            const tri = new Triangle(p, this.points[i + 2], this.points[i + 1]);
            if (i % 2) {
                tri.uv0.x = offset;
                tri.uv0.y = 1;
                tri.uv1.x = offset + step;
                tri.uv1.y = 1;
                tri.uv2.x = offset + step;
                tri.uv2.y = 0;
            } else {
                tri.uv0.x = offset;
                tri.uv0.y = 0;
                tri.uv1.x = offset + step;
                tri.uv1.y = 0;
                tri.uv2.x = offset;
                tri.uv2.y = 1;
            }
            this.tris.push(tri);
            return i < this.points.length - 3;
        });
    }
}

const updateFrame = () => {
    stats.begin();
    motions.update();
    targetPoint.x = motions.x * resolution;
    targetPoint.y = motions.y * resolution;
    const geometryChanged = updateGeometry();
    if (geometryChanged) {
        renderFrame();
    }
    stats.end();
    requestAnimationFrame(updateFrame);
};

const updateGeometry = () => {
    // We do not update geometry if it's not changed
    const dx = (targetPoint.x - typeTwister.segments[0].x);
    const dy = (targetPoint.y - typeTwister.segments[0].y);
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return false;
    // Update segments
    typeTwister.segments.forEach((link, i) => {
        if (i === 0) {
            const d = Math.sqrt(dx * dx + dy * dy);
            const max_speed = 300 * sizeFactor;
            const speed_dump = 10 * sizeFactor;
            
            const k = Math.min(max_speed, d)/d;
            const ta = Math.atan2(dy, dx);
            const da = deltaAngle(link.a, ta);
            
            link.a = ta - da * 0.8;
            link.x += k * d * Math.cos(link.a) / speed_dump;
            link.y += k * d * Math.sin(link.a) / speed_dump;
        } else {
            const prev = typeTwister.segments[i - 1];
            const a = Math.atan2(prev.y - link.y, prev.x - link.x);
            if (i === 1) {
                link.a = a;
            } else {
                const d = deltaAngle(a, prev.a);
                const rd = Math.min(typeTwister.limit, Math.abs(d));
                if (d > 0) {
                    link.a = prev.a - rd;
                } else {
                    link.a = prev.a + rd;
                }
            }
            link.x = prev.x - typeTwister.segmentWidth * Math.cos(link.a);
            link.y = prev.y - typeTwister.segmentWidth * Math.sin(link.a);
        }
        if (i < typeTwister.segments.length - 1) {
            typeTwister.tris[2 * i].a = link.a + Math.PI / 2;
            typeTwister.tris[2 * i + 1].a = link.a - Math.PI / 2;
        }
    });
    // Update points
    typeTwister.segments.forEach((link, i) => {
        let a;
        if (i === 0) {
            a = typeTwister.segments[i + 1].a;
        } else if (i === typeTwister.segments.length - 1) {
            a = link.a;
        } else {
            a = typeTwister.segments[i + 1].a + deltaAngle(typeTwister.segments[i + 1].a, link.a) / 2;
        }
        a += Math.PI / 2;
        let p = typeTwister.points[2 * i];
        p.x = link.x + typeTwister.halfWidth * Math.cos(a);
        p.y = link.y + typeTwister.halfWidth * Math.sin(a);
        p = typeTwister.points[2 * i + 1];
        p.x = link.x - typeTwister.halfWidth * Math.cos(a);
        p.y = link.y - typeTwister.halfWidth * Math.sin(a);
    });
    // Update triangles optimized
    typeTwister.trisToDraw.length = 0;
    typeTwister.debugPoints.length = 0;
    typeTwister.tris.forEach((tri, i) => {
        const p0 = tri.p0;
        const p1 = tri.p1;
        const p2 = tri.p2;
        // Triangle on screen test
        if (p0.x < 0 && p1.x < 0 && p2.x < 0) return;
        if (p0.y < 0 && p1.y < 0 && p2.y < 0) return;
        if (p0.x > canvas2d.width && p1.x > canvas2d.width && p2.x > canvas2d.width) return;
        if (p0.y > canvas2d.height && p1.y > canvas2d.height && p2.y > canvas2d.height) return;
        // Further geometry optimisation is possible…
        // …here
        typeTwister.trisToDraw.unshift(tri);
    });
    return true;
};

const renderFrame = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    typeTwister.trisToDraw.forEach((tri, i) => {
        drawTriangle(ctx, textCanvas, tri.p0.x, tri.p0.y,
            tri.p1.x, tri.p1.y, 
            tri.p2.x, tri.p2.y, 
            tri.uv0.x * textCanvas.width, tri.uv0.y * textCanvas.height, 
            tri.uv1.x * textCanvas.width, tri.uv1.y * textCanvas.height, 
            tri.uv2.x * textCanvas.width, tri.uv2.y * textCanvas.height);
    });
    // drawWireframe();
};

//by Andrew Poes
//http://jsfiddle.net/mrbendel/6rbtde5t/1/
const drawTriangle = (ctx, img, x0, y0, x1, y1, x2, y2,
    sx0, sy0, sx1, sy1, sx2, sy2) => {
    ctx.save();
    // Clip the output to the on-screen triangle boundaries.
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();
    // TODO: eliminate common subexpressions.
    const a = sx2 * sy1;
    const b = sx1 * sy2;
    const c = sy2 - sy1;
    const d = sx1 - sx2;
    const denom = sx0 * c - b + a + d * sy0;
    if (denom == 0) return;
    const e = x2 - x1;
    const f = y1 - y2;
    const g = sy1 * x2;
    const h = sy2 * x1;
    const i = sy1 * y2;
    const j = sx1 * x2;
    const k = sx1 * y2;
    const l = sy2 * y1;
    const m = sx2 * x1;
    const n = sx2 * y1;
    const pDenom = 1 / denom;
    const m11 = -(sy0 * e - g + h + (sy1 - sy2) * x0) * pDenom;
    const m12 = (i + sy0 * f - l + c * y0) * pDenom;
    const m21 = (sx0 * e - j + m + d * x0) * pDenom;
    const m22 = -(k + sx0 * f - n + (sx2 - sx1) * y0) * pDenom;
    const dx = (sx0 * (h - g) + sy0 * (j - m) + (a - b) * x0) * pDenom;
    const dy = (sx0 * (l - i) + sy0 * (k - n) + (a - b) * y0) * pDenom;

    ctx.transform(m11, m12, m21, m22, dx, dy);
    // TODO: figure out if drawImage goes faster if we specify the rectangle that
    // bounds the source coords.
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.restore();
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
    points.forEach(link => {
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

class Link extends Point {
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
    p0;
    p1;
    p2;
    uv0;
    uv1;
    uv2;
    original;
    gradient;
    pattern;
    a;
    constructor(p0, p1, p2, uv0, uv1, uv2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.uv0 = uv0 || new Point(0, 0);
        this.uv1 = uv1 || new Point(1, 0);
        this.uv2 = uv2 || new Point(0, 1);
        this.original = [p0, p1, p2];
    }
}

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    //Wait for the font loaded, then go
    FontFaceOnload('NeueMachina', {
        success: () => {
            initScene('NeueMachina');
        },
        error: initScene,
        timeout: 1000
    });
});