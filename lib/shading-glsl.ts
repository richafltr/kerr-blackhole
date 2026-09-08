export const shadeFragment = `#version 300 es
precision highp float;
uniform sampler2D transportMap, previewMap;
uniform vec2 resolution;
uniform float spin,innerRadius,time;
out vec4 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
vec3 blackbody(float temperature){
 // Three visible wavelength bands, not a calibrated CIE spectral integration.
 vec3 wavelength=vec3(.65,.55,.45);
 return .22/(pow(wavelength,vec3(5.))*(exp(min(vec3(80.),14388./(wavelength*temperature)))-1.));
}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;vec4 transport=texture(transportMap,uv);if(transport.w<-.5)transport=texture(previewMap,uv);
 vec3 radiance=vec3(0.);
 if(transport.w>.5&&transport.w<1.5){
  float r=sqrt(max(.01,dot(transport.xy,transport.xy)-spin*spin)),azimuth=atan(transport.y,transport.x);
  float phase=azimuth-time/(pow(r,1.5)+spin)*6.;
  float structure=.65+.30*noise(vec2(r*12.,sin(phase*8.)*2.))+ .15*noise(vec2(r*42.,sin(phase*21.)*4.));
  float temperature=17000.*pow(innerRadius/r,.75)*pow(max(.0001,1.-sqrt(innerRadius/r)),.25);
  radiance=blackbody(max(500.,temperature*transport.z))*structure*(1.-smoothstep(19.,22.,r));
 }else if(transport.w>1.5&&transport.w<2.5){
  vec3 d=normalize(transport.xyz);vec2 sky=vec2(atan(d.y,d.x)/6.2831853+.5,asin(clamp(d.z,-1.,1.))/3.14159265+.5);
  vec2 cell=floor(sky*vec2(1400.,700.)),f=fract(sky*vec2(1400.,700.));float h=hash(cell);
  float star=exp(-dot(f-.5,f-.5)*80.)*step(.997,h);radiance=vec3(.65,.77,1.)*star*.8;
 }
 color=vec4(radiance,1.);
}`;
export const displayFragment = `#version 300 es
precision highp float;
uniform sampler2D emission;
uniform vec2 resolution;
uniform float exposure;
out vec4 color;
vec3 bright(vec2 uv){vec3 c=texture(emission,uv).rgb;return c*smoothstep(.35,1.5,max(c.r,max(c.g,c.b)));}
vec3 film(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec3 base=texture(emission,uv).rgb,glow=vec3(0.);
 for(int i=0;i<12;i++){float a=float(i)*6.2831853/12.;vec2 d=vec2(cos(a),sin(a))/resolution;
 glow+=bright(uv+d*5.)*.5+bright(uv+d*15.)*.3+bright(uv+d*35.)*.2;}
 vec3 mapped=film(exposure*(base+.20*glow/12.));color=vec4(pow(mapped,vec3(1./2.2)),1.);}
`;
