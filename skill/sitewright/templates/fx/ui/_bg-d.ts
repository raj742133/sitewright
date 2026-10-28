/* Shared GLSL snippets for the bg-d shader backgrounds (value noise + fbm). No React, no side effects. */
export const BG_D_NOISE = `
float bdH(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float bdN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(bdH(i),bdH(i+vec2(1.,0.)),f.x),mix(bdH(i+vec2(0.,1.)),bdH(i+vec2(1.,1.)),f.x),f.y);}
float bdF(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*bdN(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
`;
