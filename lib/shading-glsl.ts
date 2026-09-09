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
vec3 emissionAt(vec4 transport){
 vec3 radiance=vec3(0.);
 if(transport.w>.5&&transport.w<1.5){
  float r=sqrt(max(.01,dot(transport.xy,transport.xy)-spin*spin)),azimuth=atan(transport.y,transport.x);
  float phase=azimuth-time/(pow(r,1.5)+spin)*6.;
  // Periodic emission texture, differentially advected; an art-directed thin disk, not GRMHD.
  vec2 orbit=vec2(cos(phase),sin(phase));
  float macro=noise(orbit*(3.+r*.3)+vec2(r*.55,r*.19));
  float filament=noise(orbit*18.+vec2(r*13.,r*1.5)+macro*2.);
  float grain=noise(orbit*62.+vec2(r*48.,r*3.));
  float structure=.24+.85*macro*macro+.65*filament*filament+.18*grain;
  structure*=.6+.4*smoothstep(.12,.8,noise(orbit*7.+vec2(r*3.1,0.)));
  float temperature=17000.*pow(innerRadius/r,.75)*pow(max(.0001,1.-sqrt(innerRadius/r)),.25);
  radiance=blackbody(max(500.,temperature*transport.z))*structure*(1.-smoothstep(19.,22.,r));
 }else if(transport.w>1.5&&transport.w<2.5){
  vec3 d=normalize(transport.xyz);vec2 sky=vec2(atan(d.y,d.x)/6.2831853+.5,asin(clamp(d.z,-1.,1.))/3.14159265+.5);
  vec2 cell=floor(sky*vec2(1400.,700.)),f=fract(sky*vec2(1400.,700.));float h=hash(cell);
  float star=exp(-dot(f-.5,f-.5)*80.)*step(.997,h);radiance=vec3(.65,.77,1.)*star*.8;
 }
 return radiance;
}
vec3 filteredPreview(vec2 uv){
 // Filter emitted radiance, never classification IDs or disk/sky coordinates across a boundary.
 vec2 size=vec2(textureSize(previewMap,0)), p=uv*size-.5, f=fract(p);
 ivec2 q=ivec2(floor(p)), hi=ivec2(size)-1;
 vec3 a=emissionAt(texelFetch(previewMap,clamp(q,ivec2(0),hi),0));
 vec3 b=emissionAt(texelFetch(previewMap,clamp(q+ivec2(1,0),ivec2(0),hi),0));
 vec3 c=emissionAt(texelFetch(previewMap,clamp(q+ivec2(0,1),ivec2(0),hi),0));
 vec3 d=emissionAt(texelFetch(previewMap,clamp(q+ivec2(1,1),ivec2(0),hi),0));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;vec4 t=texture(transportMap,uv);
 color=vec4(t.w<-.5?filteredPreview(uv):emissionAt(t),1.);
}`;
export const displayFragment = `#version 300 es
precision highp float;
uniform sampler2D emission;
uniform vec2 resolution;
uniform float exposure, projectionScale;
uniform mat3 orientation;
out vec4 color;
vec3 bright(vec2 uv){vec3 c=texture(emission,uv).rgb;return c*smoothstep(.35,1.5,max(c.r,max(c.g,c.b)));}
vec3 film(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){vec2 screen=(gl_FragCoord.xy-.5*resolution)/resolution.y*2.;
 vec3 ray=orientation*vec3(screen*.38,-1.);
 vec2 uv=(ray.xy/max(.05,-ray.z))/(.38*projectionScale)*resolution.y/resolution*.5+.5;
 if(ray.z>=0.||any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))){color=vec4(0.,0.,0.,1.);return;}
 vec3 base=texture(emission,uv).rgb,glow=vec3(0.);
 for(int i=0;i<12;i++){float a=float(i)*6.2831853/12.;vec2 d=vec2(cos(a),sin(a))/resolution;
 glow+=bright(uv+d*5.)*.5+bright(uv+d*15.)*.3+bright(uv+d*35.)*.2;}
 vec3 mapped=film(exposure*(base+.20*glow/12.));color=vec4(pow(mapped,vec3(1./2.2)),1.);}
`;
