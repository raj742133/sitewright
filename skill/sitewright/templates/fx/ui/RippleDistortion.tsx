'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { fullscreenScene, useGL } from './_t1';
import { paintPattern } from './_motion-gl-tex';

export interface RippleDistortionProps {
  /** Image to distort (same-origin or CORS-enabled). Omit for a built-in pattern drawn in the host colours. */
  src?: string;
  /** Alt text for the image; leave empty when the picture is decorative. */
  alt?: string;
  /** Distortion strength 0..2 (default 1). */
  strength?: number;
  /** Pointer movement and clicks or taps send rings across the picture (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const RINGS = 8;
const FRAG = `
uniform sampler2D uTex; uniform vec4 uRing[${RINGS}]; uniform float uAsp,uTexAsp,uStr;
varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  // object-fit: cover
  vec2 sc=uAsp>uTexAsp?vec2(1.,uTexAsp/uAsp):vec2(uAsp/uTexAsp,1.);
  vec2 tuv=(uv-.5)*sc+.5;
  vec2 disp=vec2(0.); float shade=0.;
  vec2 pa=(uv)*vec2(uAsp,1.);
  for(int i=0;i<${RINGS};i++){
    vec4 r=uRing[i];
    if(r.w>0.){
      float age=uT-r.z; vec2 c=r.xy*vec2(uAsp,1.);
      vec2 dv=pa-c; float d=length(dv);
      float x=d-age*.42;
      float env=exp(-x*x*90.)*exp(-age*.9)*r.w/(1.+d*2.);
      float wave=sin(x*48.);
      disp+=normalize(dv+1e-5)*wave*env*.06;
      shade+=cos(x*48.)*env;
    }
  }
  disp*=uStr; 
  vec2 o=disp*sc;
  float ca=.5+length(disp)*14.;
  vec3 col=vec3(texture2D(uTex,tuv+o*(1.+.35*ca)).r,texture2D(uTex,tuv+o).g,texture2D(uTex,tuv+o*(1.-.35*ca)).b);
  col+=shade*.09*uStr;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A picture seen through water: pointer movement, clicks and taps send rings across it that bend
 * and slightly split the light. WebGL texture warp; fills its parent. Pass `src`, or leave it out
 * for a built-in pattern. A still, undistorted picture with reduced motion or without WebGL.
 */
export default function RippleDistortion({ src, alt = '', strength = 1, interactive = true, className, style }: RippleDistortionProps) {
  const imgEl = useRef<HTMLImageElement | null>(null);
  const pending = useRef<HTMLImageElement | null>(null);
  const bumpRef = useRef<() => void>(() => {});
  const { wrapRef, canvasRef, status, invalidate } = useGL(
    (env) => {
      const gl = env.gl;
      const tex = gl.createTexture();
      let texAsp = 1.6;
      const upload = (src2: TexImageSource, w: number, h: number) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        texAsp = w / h;
      };
      const pat = document.createElement('canvas');
      pat.width = 1024; pat.height = 640;
      paintPattern(pat, env.pal);
      upload(pat, 1024, 640);
      const rings: { x: number; y: number; t0: number; a: number }[] = [];
      let lastDrop = 0, lastX = -1, lastY = -1, seeded = false;
      const add = (x: number, y: number, t: number, a: number) => { rings.push({ x, y, t0: t, a }); if (rings.length > RINGS) rings.shift(); };
      const sc = fullscreenScene(gl, FRAG, () => (t, _dt, e, pr) => {
        const im = pending.current;
        if (im) { pending.current = null; try { upload(im, im.naturalWidth, im.naturalHeight); } catch { /* tainted: keep the pattern */ } }
        if (!seeded) { seeded = true; add(0.62, 0.45, t - 0.5, 1.1); }
        if (!e.reduced && interactive) {
          const q = e.ptr;
          if (q.inside && !e.coarse && t - lastDrop > 0.12 && Math.hypot((q.x - lastX) * e.aspect, q.y - lastY) > 0.03) { add(q.x, q.y, t, 0.6); lastDrop = t; lastX = q.x; lastY = q.y; }
          for (const tp of q.taps) add(tp.x, tp.y, t, 1.3);
        }
        if (!e.reduced && t - (rings[rings.length - 1]?.t0 ?? 0) > 4.5) add(0.2 + ((t * 5.31) % 1) * 0.6, 0.25 + ((t * 3.17) % 1) * 0.5, t, 0.8);
        const arr = new Float32Array(RINGS * 4);
        rings.forEach((r, i) => { arr.set([r.x, r.y, r.t0, e.reduced ? 0 : r.a], i * 4); });
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(pr.u('uTex'), 0);
        gl.uniform4fv(pr.u('uRing'), arr);
        gl.uniform1f(pr.u('uAsp'), e.aspect);
        gl.uniform1f(pr.u('uTexAsp'), texAsp);
        gl.uniform1f(pr.u('uStr'), strength);
      });
      return { draw: sc.draw, dispose() { gl.deleteTexture(tex); sc.dispose(); } };
    },
    { res: 1, maxPixels: 1.8e6 },
  );
  bumpRef.current = invalidate;

  useEffect(() => {
    if (!src) return;
    let dead = false;
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => { if (!dead) { pending.current = im; bumpRef.current(); } };
    im.src = src;
    return () => { dead = true; im.onload = null; };
  }, [src]);

  return (
    <div ref={wrapRef} className={'ui-ripple-distortion' + (className ? ' ' + className : '')} style={style} data-gl={status} data-src={src ? '1' : '0'} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {src ? /* eslint-disable-next-line @next/next/no-img-element */ <img ref={imgEl} className="ui-ripple-distortion-img" src={src} alt="" /> : <div className="ui-ripple-distortion-pattern" />}
      <canvas ref={canvasRef} className="ui-ripple-distortion-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-ripple-distortion-stage">
      <RippleDistortion />
      <span className="ui-ripple-distortion-label">Touch the surface</span>
    </div>
  );
}
