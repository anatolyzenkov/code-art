const PI2 = Math.PI;

const deltaAngle = (a0, a1) => {
    const da = (a1 - a0) % PI2;
    return ((2 * da) % PI2) - da;
};

const isLocalHost = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.origin === 'file://';

const isMobileDevice = () => {
  try{ document.createEvent("TouchEvent"); return true; }
  catch(e){ return false; }
}

// Posted by Andy Langton on Tuesday, 4 December 2007
// https://andylangton.co.uk/blog/development/get-viewportwindow-size-width-and-height-javascript
const getViewport = () => {
    let viewPortWidth;
    let viewPortHeight;
    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
    if (typeof window.innerWidth != "undefined") {
        viewPortWidth = window.innerWidth;
        viewPortHeight = window.innerHeight;
    }
    // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    else if (typeof document.documentElement != "undefined" && typeof document.documentElement.clientWidth != "undefined" && document.documentElement.clientWidth != 0) {
        viewPortWidth = document.documentElement.clientWidth;
        viewPortHeight = document.documentElement.clientHeight;
    }
    // older versions of IE
    else {
        viewPortWidth = document.getElementsByTagName("body")[0].clientWidth;
        viewPortHeight = document.getElementsByTagName("body")[0].clientHeight;
    }
    return [viewPortWidth, viewPortHeight];
};

const pointPolygonHitTest = (p, poly) => {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
    let inside = false;
    if (poly[0].x !== undefined) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let xi = poly[i].x, yi = poly[i].y;
            let xj = poly[j].x, yj = poly[j].y;
            let intersect = yi > p.y != yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    } else {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            let xi = poly[i][0], yi = poly[i][1];
            let xj = poly[j][0], yj = poly[j][1];
            let intersect = yi > p.y != yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    }
    return inside;
};

const getDevicePixelRatio = () => {
  if (window.devicePixelRatio) return window.devicePixelRatio;
  return 1;
};

const clamp = (n, min, max) => {
  return Math.min(max || 1, Math.max(min || 0, n));
};

const inputXY = (e) => {
  if (
    e.type == "touchstart" ||
    e.type == "touchmove" ||
    e.type == "touchend" ||
    e.type == "touchcancel"
  ) {
    const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    return { x: touch.pageX, y: touch.pageY };
  }
  return { x: e.clientX, y: e.clientY };
};
