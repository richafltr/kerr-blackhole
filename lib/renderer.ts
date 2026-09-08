export type View = {
  inclination: number;
  roll: number;
  exposure: number;
  distance: number;
  quality: number;
};
export const defaultView: View = {
  inclination: 77,
  roll: -12,
  exposure: 1.2,
  distance: 30,
  quality: 0.7,
};
const vertex = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 resolution;
uniform float time, inclination, roll, exposure, cameraRadius;
#define PI 3.141592653589793
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
vec3 disk(vec3 hit){
 float r=length(hit),a=atan(hit.z,hit.x),flow=a-time*.8/pow(r,1.5);
 float radial=noise(vec2(r*5.,flow*4.));
 float fine=noise(vec2(r*24.,flow*11.));
 float threads=.5+.5*sin(r*29.+3.*sin(flow*9.)+noise(vec2(r*3.,flow*5.))*5.);
 float bands=.40+.60*noise(vec2(r*11.,0.));
 float texture=(.30+radial*.8+fine*.35+threads*.20)*bands;
 float inner=smoothstep(6.,6.5,r),outer=1.-smoothstep(17.,22.,r);
 float heat=pow(6./r,2.2)*inner*outer;
 vec3 tint=mix(vec3(1.,.24,.045),vec3(1.,.83,.60),pow(clamp(heat,0.,1.),.45));
 return tint*heat*texture*12.;
}
vec3 sky(vec3 d){
 vec2 uv=vec2(atan(d.z,d.x)/(2.*PI)+.5,asin(clamp(d.y,-1.,1.))/PI+.5);
 vec2 grid=uv*vec2(1800.,900.);vec2 cell=floor(grid),f=fract(grid);
 float h=hash(cell);float star=pow(max(0.,1.-length(f-vec2(hash(cell+7.),hash(cell+13.)))*2.8),8.)*step(.997,h);
 return vec3(.0006,.0008,.0012)+vec3(.8,.86,1.)*star*.9;
}
vec2 deriv(vec2 s){return vec2(s.y,-s.x+3.*s.x*s.x);}
vec2 rk4(vec2 s,float h){vec2 a=deriv(s),b=deriv(s+a*h*.5),c=deriv(s+b*h*.5),d=deriv(s+c*h);return s+h*(a+2.*b+2.*c+d)/6.;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y*2.;
 float cr=cos(roll),sr=sin(roll);uv=mat2(cr,-sr,sr,cr)*uv;
 vec3 radial=vec3(0.,cos(inclination),sin(inclination));
 vec3 right=vec3(1.,0.,0.),up=normalize(cross(radial,right));
 vec3 ray=normalize(-radial+.38*(uv.x*right+uv.y*up));
 float tangential=length(cross(ray,radial));
 float b=cameraRadius*tangential/sqrt(1.-2./cameraRadius);
 vec3 color=vec3(0.);bool resolved=false;
 if(b>.00001){
 vec3 tangent=normalize(ray-radial*dot(ray,radial));
 float u=1./cameraRadius;vec2 s=vec2(u,sqrt(max(0.,1./(b*b)-u*u+2.*u*u*u)));
 vec3 previous=radial*cameraRadius;float phi=0.;
 for(int i=0;i<650;i++){
  float h=.012;vec2 next=rk4(s,h);phi+=h;
  if(next.x<=0.){float endpoint=phi-h+h*s.x/(s.x-next.x);color=sky(radial*cos(endpoint)+tangent*sin(endpoint));resolved=true;break;}
  vec3 pos=(radial*cos(phi)+tangent*sin(phi))/next.x;
  if(previous.y*pos.y<0.){
   float t=previous.y/(previous.y-pos.y);vec3 hit=mix(previous,pos,t);float r=length(hit);
   if(r>=6.&&r<=22.){color=disk(hit);resolved=true;break;}
  }
  if(next.x>=.5){resolved=true;break;}
  previous=pos;s=next;
 }
 }
 // Unresolved near-critical rays are dark at this bounded integration budget.
 vec3 mapped=vec3(1.)-exp(-color*exposure);
 mapped=pow(mapped,vec3(1./2.2));
 float vignette=1.-.13*min(1.,dot(uv,uv)*.3);
 fragColor=vec4(mapped*vignette,1.);
}`;
export function createRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
  });
  if (!context)
    throw new Error(
      'WebGL2 is unavailable. Enable GPU acceleration or use another browser.',
    );
  const gl: WebGL2RenderingContext = context;
  const compile = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(message || 'Shader compilation failed');
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex),
    fs = compile(gl.FRAGMENT_SHADER, fragment),
    program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
  gl.useProgram(program);
  const uniforms = Object.fromEntries(
    [
      'resolution',
      'time',
      'inclination',
      'roll',
      'exposure',
      'cameraRadius',
    ].map((n) => [n, gl.getUniformLocation(program, n)]),
  );
  return {
    render(time: number, view: View) {
      const rect = canvas.getBoundingClientRect();
      const scale =
        Math.min(1, 1100 / Math.max(rect.width, rect.height)) * view.quality;
      const width = Math.max(1, Math.round(rect.width * scale)),
        height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.inclination, (view.inclination * Math.PI) / 180);
      gl.uniform1f(uniforms.roll, (view.roll * Math.PI) / 180);
      gl.uniform1f(uniforms.exposure, view.exposure);
      gl.uniform1f(uniforms.cameraRadius, view.distance);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
