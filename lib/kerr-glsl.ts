// Analytic spatial derivatives, independently checked against CPU automatic differentiation.
export const kerrGLSL = `
struct Field {float r;float H;vec3 l;vec3 dH;vec3 dlx;vec3 dly;vec3 dlz;};
struct Ray {vec3 x;vec3 p;float pt;};
struct Flow {vec3 x;vec3 p;};
struct Transport {vec4 data;vec4 checks;};
uniform float spin, innerRadius, stepScale;
uniform bool diagnostics, includeDisk;
Field field(vec3 x){
 float a2=spin*spin,B=dot(x,x)-a2,D=sqrt(B*B+4.*a2*x.z*x.z);
 float r2=.5*(B+D),r=sqrt(r2),den=r2+a2,denH=r2*r2+a2*x.z*x.z;
 vec3 dr=(x+(B*x+vec3(0.,0.,2.*a2*x.z))/D)/(2.*r);
 vec3 l=vec3((r*x.x+spin*x.y)/den,(r*x.y-spin*x.x)/den,x.z/r);
 float H=r*r2/denH;
 vec3 dH=H*(3.*dr/r-(4.*r*r2*dr+vec3(0.,0.,2.*a2*x.z))/denH);
 vec3 dd=2.*r*dr;
 vec3 dlx=(x.x*dr+vec3(r,spin,0.)-l.x*dd)/den;
 vec3 dly=(x.y*dr+vec3(-spin,r,0.)-l.y*dd)/den;
 vec3 dlz=vec3(0.,0.,1.)/r-x.z*dr/r2;
 return Field(r,H,l,dH,dlx,dly,dlz);
}
Flow flow(Ray ray){Field f=field(ray.x);float k=-ray.pt+dot(f.l,ray.p);
 return Flow(ray.p-2.*f.H*k*f.l,f.dH*k*k+2.*f.H*k*(ray.p.x*f.dlx+ray.p.y*f.dly+ray.p.z*f.dlz));}
Ray shifted(Ray r,Flow d,float h){return Ray(r.x+h*d.x,r.p+h*d.p,r.pt);}
Ray advance(Ray r,float h){Flow a=flow(r),b=flow(shifted(r,a,.5*h)),c=flow(shifted(r,b,.5*h)),d=flow(shifted(r,c,h));
 return Ray(r.x+h*(a.x+2.*b.x+2.*c.x+d.x)/6.,r.p+h*(a.p+2.*b.p+2.*c.p+d.p)/6.,r.pt);}
float constraint(Ray r){Field f=field(r.x);float k=-r.pt+dot(f.l,r.p);return .5*(-r.pt*r.pt+dot(r.p,r.p))-f.H*k*k;}
Transport trace(Ray ray){
 float horizon=1.+sqrt(1.-spin*spin),initialLz=ray.x.x*ray.p.y-ray.x.y*ray.p.x,maxNull=0.,maxLz=0.;
 for(int i=0;i<900;i++){
  Field f=field(ray.x);Flow d=flow(ray);float speed=max(length(d.x),1.);
  if(f.r<horizon+.025)return Transport(vec4(0.),vec4(maxNull,maxLz,float(i),f.r));
  if(f.r>100.)return Transport(vec4(normalize(d.x),2.),vec4(maxNull,maxLz,float(i),f.r));
  float h=stepScale*min(.8,min(.055*f.r/speed,.22*(f.r-horizon)/speed));
  Ray next=advance(ray,h);
  if(any(isnan(next.x))||any(isinf(next.x))||any(isnan(next.p))||any(isinf(next.p)))return Transport(vec4(0.,0.,0.,4.),vec4(1.,1.,float(i),f.r));
  if(diagnostics){maxNull=max(maxNull,abs(constraint(next))/(ray.pt*ray.pt));maxLz=max(maxLz,abs(next.x.x*next.p.y-next.x.y*next.p.x-initialLz)/max(1.,abs(initialLz)));}
  if(includeDisk&&ray.x.z*next.x.z<0.){
   float t=ray.x.z/(ray.x.z-next.x.z);Ray hit=advance(ray,h*t);
   for(int j=0;j<2;j++){Flow hd=flow(hit);t=clamp(t-hit.x.z/(h*hd.x.z),0.,1.);hit=advance(ray,h*t);}
   Field hf=field(hit.x);
   if(hf.r>=innerRadius&&hf.r<=22.){
    float omega=1./(pow(hf.r,1.5)+spin);vec3 velocity=vec3(-omega*hit.x.y,omega*hit.x.x,0.);
    float lk=1.+dot(hf.l,velocity),norm=1.-dot(velocity,velocity)-2.*hf.H*lk*lk;
    float frequency=(hit.pt+omega*(hit.x.x*hit.p.y-hit.x.y*hit.p.x))/sqrt(norm);
    if(!(norm>0.&&frequency>0.))return Transport(vec4(0.,0.,0.,4.),vec4(maxNull,maxLz,float(i),hf.r));
    return Transport(vec4(hit.x.xy,1./frequency,1.),vec4(maxNull,maxLz,float(i+1),hf.r));
   }
  }
  ray=next;
 }
 return Transport(vec4(0.,0.,0.,3.),vec4(maxNull,maxLz,900.,0.));
}
`;
export const fullscreenVertex = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const transportFragment = `#version 300 es
precision highp float;
${kerrGLSL}
uniform vec2 resolution;
uniform float roll;
uniform vec3 cameraPosition;
uniform vec4 observer, forwardBasis, rightBasis, upBasis;
uniform sampler2D initialX,initialP;
layout(location=0) out vec4 transportData;
layout(location=1) out vec4 diagnosticData;
void main(){
 Ray ray;
 if(diagnostics){ivec2 pixel=ivec2(gl_FragCoord.xy);vec4 x=texelFetch(initialX,pixel,0);ray=Ray(x.xyz,texelFetch(initialP,pixel,0).xyz,x.w);}
 else {
 vec2 q=(gl_FragCoord.xy-.5*resolution)/resolution.y*2.;
 q=.38*mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*q;
 vec4 p=-observer+(forwardBasis+q.x*rightBasis+q.y*upBasis)/sqrt(1.+dot(q,q));
 ray=Ray(cameraPosition,p.yzw,p.x);
 }
 Transport result=trace(ray);transportData=result.data;diagnosticData=result.checks;
}`;
