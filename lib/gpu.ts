export function program(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Shader compilation failed');
    }
    return shader;
  };
  const v = compile(gl.VERTEX_SHADER, vertex),
    f = compile(gl.FRAGMENT_SHADER, fragment),
    p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || 'Shader link failed');
  return p;
}
export function texture(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  data: Float32Array | null = null,
  half = false,
) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    half ? gl.LINEAR : gl.NEAREST,
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    half ? gl.LINEAR : gl.NEAREST,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    half ? gl.RGBA16F : gl.RGBA32F,
    w,
    h,
    0,
    gl.RGBA,
    gl.FLOAT,
    data,
  );
  return t;
}
export function target(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  half = false,
) {
  const tex = texture(gl, w, h, null, half),
    fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
    throw new Error('Floating point rendering is unsupported');
  return { tex, fbo, w, h };
}
export type Target = ReturnType<typeof target>;
export function removeTarget(gl: WebGL2RenderingContext, t: Target | null) {
  if (t) {
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fbo);
  }
}
