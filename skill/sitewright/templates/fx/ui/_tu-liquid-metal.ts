import { GLSL_NOISE2 } from './_t1';

/** Fragment shader for the liquid-metal-button: an SDF pill / orb, a bevelled chrome rim lit by a procedural studio environment (with per-channel dispersion), a dark liquid-metal face, hover bloom and a click ripple. */
export const LIQUID_FRAG = GLSL_NOISE2 + `
uniform float uShape,uH,uP,uRipT,uDisp,uTintAmt;uniform vec2 uPtr,uRipPos;uniform vec3 uTint;varying vec2 vUv;
float sdf(vec2 p,vec2 hs){
  if(uShape>.5)return length(p)-min(hs.x,hs.y);
  vec2 d=abs(p)-(hs-vec2(hs.y));
  return length(max(d,0.))+min(max(d.x,d.y),0.)-hs.y;
}
float env(vec3 r,float k){
  float y=r.y*.5+.5;
  float hz=smoothstep(.40,.5,y+.09*sin(r.x*5.+k)+.05*sin(r.x*11.-k*1.3));
  float v=mix(.04,.82,hz);
  float strip=smoothstep(.86,.97,sin(r.x*3.4+k*.6+1.));
  v+=strip*.9*smoothstep(.45,.8,y);
  v+=.5*smoothstep(.93,1.,sin(r.x*7.-k*.9))*(1.-hz)*.6;
  return v;
}
vec3 chrome(vec3 r,float k){
  vec3 c=vec3(env(r,k)*.97,env(r,k)*1.0,env(r,k)*1.05);
  return c;
}
void main(){
  float A=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(A,1.);
  float px=1./uRes.y;
  vec2 hs=vec2(A,1.)*.5-vec2(.028);
  float d=sdf(p,hs);
  float cover=1.-smoothstep(-px,px,d);
  if(cover<=0.){gl_FragColor=vec4(0.);return;}
  float t=-d;
  float bw=mix(.17,.22,uShape)+.015*uH;
  float bev=1.-smoothstep(0.,bw,t);
  vec2 e=vec2(.0015,0.);
  vec2 g=vec2(sdf(p+e.xy,hs)-sdf(p-e.xy,hs),sdf(p+e.yx,hs)-sdf(p-e.yx,hs))/(2.*e.x);
  float tm=uT*(.22+.3*uH);
  vec2 fl=vec2(fbm(p*3.2+vec2(tm,0.)),fbm(p*3.2+vec2(7.3,-tm)))-.5;
  vec2 rp=(vUv-uRipPos)*vec2(A,1.);
  float rr=uT-uRipT;
  float rd=length(rp);
  float ring=sin((rd-rr*.85)*30.)*exp(-abs(rd-rr*.85)*8.)*exp(-rr*1.5)*step(0.,rr);
  vec2 rip=normalize(rp+1e-4)*ring*.55;
  vec3 n=normalize(vec3(g*pow(bev,.75)*2.4+fl*(.5+.45*uH)+rip,1.));
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  r.xy+=(uPtr-.5)*.55;
  float k=tm*1.6;
  float dp=.06*uDisp*(.6+.8*uH);
  vec3 col=vec3(chrome(r+vec3(n.xy*dp,0.),k).r,chrome(r,k).g,chrome(r-vec3(n.xy*dp,0.),k).b);
  col=mix(col,col*(uTint*1.5+.2),uTintAmt);
  float fm=smoothstep(bw*.9,bw*1.1,t);
  vec3 face=vec3(.045)+col*.17+rip.x*.0;
  face+=uTint*uTintAmt*.05;
  face+=vec3(.5)*ring*.08;
  col=mix(col,face,fm);
  col+=vec3(.9)*exp(-pow((t-bw)/.012,2.))*(.35+.3*uH);
  col+=vec3(1.)*(1.-smoothstep(0.,.012,t))*.4;
  col+=uTint*uH*.1*bev;
  col*=1.-.18*uP;
  col=min(col,vec3(1.));
  gl_FragColor=vec4(col*cover,cover);
}`;
