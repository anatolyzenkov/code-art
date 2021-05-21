// Screen parameters
const resolution = Math.min(2, getDevicePixelRatio());
let canvas2d;
let ctx;
let targetPoint;
const DEBUG = isLocalHost();
let stats;
let motions;
let img;

// Geometry parameters
const sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
let length;
let width;
let halfWidth;
const links = [];
const points = [];
const tris = [];
const trisToDraw = [];
let startCap;
let endCap;
const debugPoints = [];

const initScene = () => {
    // Fit size to image size
    length = img.width * sizeFactor * resolution;
    width = img.height * sizeFactor * resolution;
    halfWidth = width/2;
    distance = 20 * sizeFactor * resolution;
    limit = distance / width * 2;
    linksCount = length / distance;
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator();
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Setup canvas
    canvas2d = getCanvas(getViewport()[0] * resolution, getViewport()[1] * resolution, 'canvas2d', ['main-canvas']);
    canvas2d.style.width = getViewport()[0] + 'px';
    canvas2d.style.height = getViewport()[1] + 'px';
    ctx = canvas2d.getContext('2d');
    document.body.appendChild(canvas2d);
    // Setup geometry. Links
    for (let i = 0; i < linksCount; i++) {
        links.push(new Link(canvas2d.width + i * distance, canvas2d.height));
        points.push(new Point(), new Point());
    }
    // Setup geometry. Caps
    startCap = new Cap();
    endCap = new Cap();
    // Setup geometry. Points and Triangles
    points.every((p, i) => {
        const step = 1/linksCount;
        const offset = step * Math.floor(i / 2);
        let tri;
        if (i % 2) {
            tri = new Triangle(p, points[i + 2], points[i + 1]);
            tri.uv0.x = offset;
            tri.uv0.y = 1;
            tri.uv1.x = offset + step;
            tri.uv1.y = 1;
            tri.uv2.x = offset + step;
            tri.uv2.y = 0;
        } else {
            tri = new Triangle(p, points[i + 2], points[i + 1]);
            tri.uv0.x = offset;
            tri.uv0.y = 0;
            tri.uv1.x = offset + step;
            tri.uv1.y = 0;
            tri.uv2.x = offset;
            tri.uv2.y = 1;
        }
        tris.push(tri);
        return i < points.length - 3;
    });
    // Setup events
    let timeoutID = -1;
    window.addEventListener('resize', () => {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            canvas2d.width = getViewport()[0] * resolution;
            canvas2d.height = getViewport()[1] * resolution;
            canvas2d.style.width = getViewport()[0] + 'px';
            canvas2d.style.height = getViewport()[1] + 'px';
        }, 300);
    });
    // Setup states
    targetPoint = new Point(canvas2d.width/2, canvas2d.height/2);
    updateFrame();
};

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
    // Do not update if not changed
    const dx = (targetPoint.x - links[0].x);
    const dy = (targetPoint.y - links[0].y);
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return false;
    // Update links
    links.forEach((link, i) => {
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
            const prev = links[i - 1];
            const a = Math.atan2(prev.y - link.y, prev.x - link.x);
            if (i === 1) {
                link.a = a;
            } else {
                const d = deltaAngle(a, prev.a);
                const rd = Math.min(limit, Math.abs(d));
                if (d > 0) {
                    link.a = prev.a - rd;
                } else {
                    link.a = prev.a + rd;
                }
            }
            link.x = prev.x - distance * Math.cos(link.a);
            link.y = prev.y - distance * Math.sin(link.a);
        }
        if (i < links.length - 1) {
            tris[2 * i].a = link.a + Math.PI / 2;
            tris[2 * i + 1].a = link.a - Math.PI / 2;
        }
    });
    // Update points
    links.forEach((link, i) => {
        let a;
        if (i === 0) {
            a = links[i + 1].a;
        } else if (i === links.length - 1) {
            a = link.a;
        } else {
            a = links[i + 1].a + deltaAngle(links[i + 1].a, link.a) / 2;
        }
        a += Math.PI / 2;
        let p = points[2 * i];
        p.x = link.x + halfWidth * Math.cos(a);
        p.y = link.y + halfWidth * Math.sin(a);
        p = points[2 * i + 1];
        p.x = link.x - halfWidth * Math.cos(a);
        p.y = link.y - halfWidth * Math.sin(a);
    });
    // Update triangles optimized
    trisToDraw.length = 0;
    debugPoints.length = 0;
    tris.forEach((tri, i) => {
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
        // Gradient calculation for triangle
        const p0p1 = new Point(p1.x - p0.x, p1.y - p0.y);
        const p0p2 = new Point(p2.x - p0.x, p2.y - p0.y);
        const dq = p0p2.x * p0p2.x + p0p2.y * p0p2.y;
        const dot = p0p1.x * p0p2.x + p0p1.y * p0p2.y
        const t = dot / dq;
        const px = p0.x + p0p2.x * t;
        const py = p0.y + p0p2.y * t;
        const j = Math.floor(i / 2);
        tri.pattern = ctx.createPattern(img, 'no-repeat');
        trisToDraw.unshift(tri);
    });
    return true;
};

const renderFrame = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    trisToDraw.forEach((tri, i) => {
        drawTriangle(ctx, img, tri.p0.x, tri.p0.y,
            tri.p1.x, tri.p1.y, 
            tri.p2.x, tri.p2.y, 
            tri.uv0.x * img.width, tri.uv0.y * img.height, 
            tri.uv1.x * img.width, tri.uv1.y * img.height, 
            tri.uv2.x * img.width, tri.uv2.y * img.height);
    });
};

//by Andrew Poes
//http://jsfiddle.net/mrbendel/6rbtde5t/1/
var drawTriangle = function(ctx, im, x0, y0, x1, y1, x2, y2,
    sx0, sy0, sx1, sy1, sx2, sy2) {
    ctx.save();

    // Clip the output to the on-screen triangle boundaries.
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();

    // TODO: eliminate common subexpressions.
    var denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
    if (denom == 0) {
        return;
    }
    var m11 = -(sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
    var m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
    var m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
    var m22 = -(sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
    var dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
    var dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;

    ctx.transform(m11, m12, m21, m22, dx, dy);

    // TODO: figure out if drawImage goes faster if we specify the rectangle that
    // bounds the source coords.
    ctx.drawImage(im, 0, 0);
    ctx.restore();
};

const drawTris = () => {
    trisToDraw.forEach((tri, i) => {
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
    img = new Image();
    img.onload = initScene;
    img.src="./typography.png";
});