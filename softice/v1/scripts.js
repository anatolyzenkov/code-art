// Screen parameters
const resolution = 1;//Math.min(2, getDevicePixelRatio());
let canvas2d;
let ctx;
let targetPoint;
const DEBUG = isLocalHost();
let stats;
let motions;

// Geometry parameters
const sizeFactor = Math.max(getViewport()[0], getViewport()[1]) / 1200;
const lengthFactor = isMobileDevice() ? 4000 : 6000;
const length = 600;//lengthFactor * resolution * sizeFactor;
const width = 300 * resolution * sizeFactor;
const halfWidth = width/2;
const distanceFactor = isMobileDevice() ? 26 : 20;
const distance = distanceFactor * resolution * sizeFactor;
const limit = distance / width * 2;
const linksCount = length / distance;
const links = [];
const points = [];
const tris = [];
const trisToDraw = [];
const debugPoints = [];

// Paint parameters
const gradientStops = [];
const baseColor = '#f2c0c1';
const color0 = '#f76c55';
const color1 = '#11545c';

const initScene = () => {
    // Add Stats
    stats = new Stats();
    motions = new MotionSimulator();
    if (DEBUG) {
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    }
    // Setup canvas
    canvas2d = document.createElement('canvas');
    canvas2d.id = 'canvas2d';
    canvas2d.width = getViewport()[0] * resolution;
    canvas2d.height = getViewport()[1] * resolution;
    canvas2d.style.width = getViewport()[0] + 'px';
    canvas2d.style.height = getViewport()[1] + 'px';
    ctx = canvas2d.getContext('2d');
    document.body.appendChild(canvas2d);
    // Setup geometry. Links
    for (let i = 0; i < linksCount; i++) {
        links.push(new Link(canvas2d.width + i * distance, canvas2d.height));
        points.push(new Point(), new Point());
    }
    // Setup geometry. Points and Triangles
    points.every((p, i) => {
        if (i % 2) {
            tris.push(new Triangle(p, points[i + 1], points[i + 2]));
        } else {
            tris.push(new Triangle(p, points[i + 1], points[i + 2]));
        }
        return i < points.length - 3;
    });
    // Setup geometry. Gradient stops
    const count = 12;
    for (let i = 1; i < count; i++) {
        const stop0 = (1 + Math.cos(Math.PI * clamp(i/count + 1/count/4 + 0.001)))/2;
        const stop1 = (1 + Math.cos(Math.PI * clamp(i/count - 1/count/4 - 0.001)))/2;
        const color = i % 4 ? color0 : color1;
        if (i%2) {
            gradientStops.push({'stop': stop0, 'color': i % 2 ? baseColor : color });
            gradientStops.push({'stop': stop1, 'color': i % 2 ? baseColor : color });
        } else {
            gradientStops.push({'stop': (1 - stop0), 'color': i % 2 ? baseColor : color });
            gradientStops.push({'stop': (1 - stop1), 'color': i % 2 ? baseColor : color });
        }
    }
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
    let k = 0;
    tris.forEach((tri, i) => {
        const p0 = tri.p0;
        const p1 = tri.p1;
        const p2 = tri.p2;
        // Triangle on screen test
        // if (p0.x < 0 && p1.x < 0 && p2.x < 0) return;
        // if (p0.y < 0 && p1.y < 0 && p2.y < 0) return;
        // if (p0.x > canvas2d.width && p1.x > canvas2d.width && p2.x > canvas2d.width) return;
        // if (p0.y > canvas2d.height && p1.y > canvas2d.height && p2.y > canvas2d.height) return;
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
        if (true) { // Calculating round gradients at the ends
            if (i % 2) {
                const nextTri = tris[(i + 1) % tris.length];
                const j = Math.floor(i / 2);
                const prevLink = links[Math.floor(i / 2)];
                const nextLink = links[(Math.floor(i / 2)+1) % links.length];
                const midPoint = Point.summ(prevLink, nextLink).scale(0.5);
                let interpolatedPoint;
                xing = lineLineIntersection(p0, p1, nextTri.p2, nextTri.p1);
                if (xing !== undefined) {
                    const mDist = Point.magnitude(midPoint, xing);
                    if (mDist < 1000) {
                        const iDist = (Point.magnitude(prevLink, xing) + Point.magnitude(nextLink, xing)) / 2;
                        interpolatedPoint = Point.summ(xing, Point.diff(midPoint, xing).scale(iDist / mDist));
                        debugPoints.push(interpolatedPoint);
                    } else {
                        interpolatedPoint = midPoint;
                        debugPoints.push(midPoint);
                    }
                } else {
                    interpolatedPoint = midPoint;
                    debugPoints.push(midPoint);
                }
                //1
                let ttd = Point.magnitude (prevLink, interpolatedPoint);
                let offset = halfWidth - k;
                k += ttd;
                let ttp = new Point(
                    prevLink.x + (interpolatedPoint.x - prevLink.x) * offset / ttd, 
                    prevLink.y + (interpolatedPoint.y - prevLink.y) * offset / ttd
                );
                tri.gradient = ctx.createRadialGradient(ttp.x, ttp.y, 0, ttp.x, ttp.y, halfWidth);
                gradientStops.forEach(s => {
                    if (s.stop * 2 < 1) tri.gradient.addColorStop(1 - s.stop * 2, s.color);
                });
                trisToDraw.unshift(tri);
                //2
                ttd = Point.magnitude (interpolatedPoint, nextLink);
                offset = halfWidth - k;
                k += ttd;
                ttp = new Point(
                    interpolatedPoint.x + (nextLink.x - interpolatedPoint.x) * offset / ttd, 
                    interpolatedPoint.y + (nextLink.y - interpolatedPoint.y) * offset / ttd
                );
                nextTri.gradient = ctx.createRadialGradient(ttp.x, ttp.y, 0, ttp.x, ttp.y, halfWidth);
                gradientStops.forEach(s => {
                    if (s.stop * 2 < 1) nextTri.gradient.addColorStop(1 - s.stop * 2, s.color);
                });
                trisToDraw.unshift(nextTri);
                // if (!(i % 2)) {
                //     debugPoints[debugPoints.length - 1] = ttp;
                //     debugPoints.push(nextPoint);
                // } else {
                //     debugPoints.push(ttp);
                // }
                // let prevPoint = prevLink;
                // let nextPoint = nextLink;
                // if (!(i % 2)) {
                //     debugPoints.push(prevPoint);
                //     if (xing !== undefined) {
                //         const md = Point.magnitude(midPoint, xing);
                //         if (md < 1000) {
                //             const pd = Point.magnitude(prevPoint, xing);
                //             const nd = Point.magnitude(nextPoint, xing);
                //             const mdd = (pd + nd) / 2;
                //             const sx = xing.x + (midPoint.x - xing.x) * mdd / md;
                //             const sy = xing.y + (midPoint.y - xing.y) * mdd / md;
                //             debugPoints.push(new Point(sx, sy));
                //         } else {
                //             debugPoints.push(midPoint);
                //         }
                //         // debugPoints.push(intp);
                //     } else {
                //         debugPoints.push(midPoint);
                //     }
                //     nextPoint = debugPoints[debugPoints.length - 1];
                // } else {
                //     prevPoint = debugPoints[debugPoints.length - 1];
                // }
                
                // d = j * distance - halfWidth;
                // const dx = prevLink.x - nextLink.x;
                // const dy = prevLink.y - nextLink.y;
                // const ux = prevLink.x + dx * d / distance;
                // const uy = prevLink.y + dy * d / distance;
                
            }
        } else {
            tri.gradient = ctx.createLinearGradient(p1.x, p1.y, px, py);
            gradientStops.forEach(s => {
                tri.gradient.addColorStop(s.stop, s.color);
            });
            trisToDraw.unshift(tri);
        }
    });
    return true;
};

const renderFrame = () => {
    ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    trisToDraw.forEach((tri, i) => {
        ctx.beginPath();
        ctx.fillStyle = tri.gradient;
        ctx.strokeStyle = tri.gradient;
        tri.original.forEach((p, j) => {
            if (j === 0) {
                ctx.moveTo(p.x, p.y);
            } else{
                ctx.lineTo(p.x, p.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    //For debuging purposes
    drawTris();
    // drawPoints(links);
    // drawPoints(points);
    drawPoints(debugPoints, true);
    // drawTarget();
};
const drawTris = () => {
    trisToDraw.forEach((tri, i) => {
        ctx.beginPath();
        ctx.strokeStyle = '#000';
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

class Triangle {
    p0;
    p1;
    p2;
    original;
    gradient;
    a;
    constructor(p0, p1, p2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.original = [p0, p1, p2];
    }
}

//All starts here when DOM is ready
document.addEventListener("DOMContentLoaded", (event) => {
    initScene();
    updateFrame();
});