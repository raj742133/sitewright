'use client';
import { useRef, type CSSProperties } from 'react';
import { clamp, fullscreenScene, GLSL_NOISE2, useGL } from './_t1';
import { drawPattern, drawTerminal, drawTitle, TH, TW, type CrtScreenKind } from './_tu-bg-crt';
import { TuDemo } from './_tu-bg-demo';

export type { CrtScreenKind };
export interface CrtScreenProps {
  /** What the tube shows: `terminal`, `pattern` (test card), `static` or `title` (arcade attract screen). Default `terminal`. */
  screen?: CrtScreenKind;
  /** Glass curvature, 0 to 1 (default 0.6). */
  curve?: number;
  /** Scanline and phosphor-mask strength, 0 to 1 (default 0.7). */
  scanlines?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform sampler2D uTex; uniform float uScr,uCurve,uScan,uFlick,uDark; uniform vec3 uInk,uP;
varying vec2 vUv;
${GLSL_NOISE2}
float rbox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec3 tex(vec2 uv){return texture2D(uTex,vec2(uv.x,1.-uv.y)).rgb;}
void main(){
  vec2 px=vUv*uRes; float asp=uRes.x/uRes.y;
  float sh=min(uRes.y*.9,uRes.x*.9/1.3333); vec2 half_=vec2(sh*1.3333,sh)*.5;
  vec2 cs=(px-uRes*.5)/half_;
  vec2 d=cs*(1.+uCurve*.05*vec2(cs.y*cs.y,cs.x*cs.x)+uCurve*.03*dot(cs,cs));
  float bez=rbox((px-uRes*.5),half_*vec2(1.07,1.07)+8.,26.);
  float scr=rbox(d*half_,half_*.985,22.);
  vec3 col=vec3(0.); float a=0.;
  if(bez<0.){
    vec3 body=mix(vec3(.05),vec3(.14),smoothstep(-26.,0.,bez)) ;
    body=mix(body,vec3(.02),smoothstep(0.,-6.,bez));
    body+=.05*vec3(smoothstep(.35,.0,length(vUv-vec2(.2,.92))));
    col=body; a=1.;
    if(scr<0.){
      vec2 uv=d*.5+.5;
      vec3 c;
      if(uScr>1.5&&uScr<2.5){
        float row=floor(uv.y*240.);
        float tear=step(.985,hash(vec2(row*.13,floor(uT*9.))))*(hash(vec2(row,uT))-.5)*.08;
        vec2 g=floor((uv+vec2(tear,0.))*vec2(320.,240.))+floor(uT*60.);
        float n=hash(g); n=n*n*(1.5-.5*n);
        float roll=smoothstep(.0,.2,fract(uv.y*.6-uT*.35))*.35;
        c=vec3(n*(.75+.25*hash(g+9.)))*(.8+roll)+uP*.08;
      } else {
        vec2 o=vec2(.0016,.0);
        c=vec3(tex(uv+o).r,tex(uv).g,tex(uv-o).b);
        vec3 bl=(tex(uv+vec2(.006,0.))+tex(uv-vec2(.006,0.))+tex(uv+vec2(0.,.008))+tex(uv-vec2(0.,.008)))*.25;
        c+=bl*.55;
      }
      float sl=.5+.5*sin(uv.y*240.*6.2832);
      c*=1.-uScan*.38*(1.-sl);
      float m=mod(floor(gl_FragCoord.x),3.);
      vec3 mask=vec3(m<1.?1.:.78,m>=1.&&m<2.?1.:.78,m>=2.?1.:.78);
      c*=mix(vec3(1.),mask,uScan*.5);
      c*=uFlick;
      c+=.06*smoothstep(.0,.08,fract(uv.y*.7-uT*.12))*smoothstep(.2,.1,fract(uv.y*.7-uT*.12))*.0;
      float vig=smoothstep(1.35,.45,length(cs*vec2(.85,1.)));
      c*=.45+.7*vig;
      c+=.05*smoothstep(.0,.9,1.-length(cs-vec2(-.55,.6)))*(uDark>.5?1.:1.4);
      c*=smoothstep(.0,-1.,scr)*.0+1.;
      float edge=smoothstep(0.,-8.,scr);
      col=mix(vec3(0.),c,edge);
    }
  }
  gl_FragColor=vec4(col*a,a);
}`;

/**
 * A curved-glass CRT drawn by a fragment shader: barrel curvature, chromatic fringing, bloom, scanlines,
 * phosphor mask, vignette, flicker and a glass glint inside a dark bezel. `screen` picks what the tube
 * shows (terminal, test pattern, static, arcade title screen; all original art in --primary/--signal/--ink).
 * Fills the positioned parent, centred; aria-hidden; no pointer events. Reduced motion: one still frame.
 * Without WebGL a CSS tube with scanlines is shown.
 */
export default function CrtScreen({ screen = 'terminal', ...rest }: CrtScreenProps) {
  return <Tube key={screen} screen={screen} {...rest} />;
}

function Tube({ screen, curve = 0.6, scanlines = 0.7, className, style }: CrtScreenProps & { screen: CrtScreenKind }) {
  const cv = useRef<{ c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null>(null);
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const gl = env.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (!cv.current) { const c = document.createElement('canvas'); c.width = TW; c.height = TH; const x = c.getContext('2d'); if (x) cv.current = { c, x }; }
      const sc = fullscreenScene(gl, FRAG, () => (t, _dt, e, pr) => {
        const ctx = cv.current;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (ctx && screen !== 'static') {
          const pal = { primary: e.pal.primary, signal: e.pal.signal, ink: e.pal.ink };
          ctx.x.textAlign = 'left';
          if (screen === 'terminal') drawTerminal(ctx.x, t, pal, e.reduced);
          else if (screen === 'title') drawTitle(ctx.x, t, pal, e.reduced);
          else drawPattern(ctx.x, t, pal);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.c);
        }
        gl.uniform1i(pr.u('uTex'), 0);
        gl.uniform1f(pr.u('uScr'), screen === 'pattern' ? 1 : screen === 'static' ? 2 : screen === 'title' ? 3 : 0);
        gl.uniform1f(pr.u('uCurve'), clamp(curve, 0, 1));
        gl.uniform1f(pr.u('uScan'), clamp(scanlines, 0, 1));
        gl.uniform1f(pr.u('uFlick'), e.reduced ? 1 : 0.965 + 0.035 * Math.sin(t * 57) * Math.sin(t * 3.1));
        gl.uniform1f(pr.u('uDark'), 0.2126 * e.pal.surface[0] + 0.7152 * e.pal.surface[1] + 0.0722 * e.pal.surface[2] < 0.45 ? 1 : 0);
        gl.uniform3fv(pr.u('uInk'), e.pal.ink);
        gl.uniform3fv(pr.u('uP'), e.pal.primary);
      });
      return { draw: sc.draw, dispose() { sc.dispose(); gl.deleteTexture(tex); } };
    },
    { res: 0.85, fps: 30, maxPixels: 1.8e6, pointer: false },
  );
  return (
    <div ref={wrapRef} className={'ui-crt-screen' + (className ? ' ' + className : '')} style={style} data-gl={status} data-screen={screen} aria-hidden="true">
      <div className="ui-crt-screen-tube" />
      <canvas ref={canvasRef} className="ui-crt-screen-canvas" hidden={status === 'off'} />
    </div>
  );
}

const VARIANTS = ['terminal', 'pattern', 'static', 'title'] as const;
const NAMES: Record<CrtScreenKind, string> = { terminal: 'Terminal', pattern: 'Test card', static: 'Static', title: 'Arcade' };
export function Demo() {
  return (
    <TuDemo dock="bottom" title="CRT screen" sub="Four screens on one curved tube." variants={VARIANTS} labels={NAMES}>
      {(v) => <CrtScreen screen={v} />}
    </TuDemo>
  );
}
