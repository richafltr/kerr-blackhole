import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fullscreenVertex, transportFragment } from '../lib/kerr-glsl.ts';
import { shadeFragment, displayFragment } from '../lib/shading-glsl.ts';
const directory=mkdtempSync(join(tmpdir(),'kerr-shader-check-'));
try {
  const vertex=join(directory,'fullscreen.vert');writeFileSync(vertex,fullscreenVertex);
  for(const [name,source] of Object.entries({transport:transportFragment,shade:shadeFragment,display:displayFragment})) {
    const fragment=join(directory,name+'.frag');writeFileSync(fragment,source);
    const result=spawnSync(process.env.GLSLANG_VALIDATOR??'glslangValidator',['-l',vertex,fragment],{encoding:'utf8'});
    if(result.error)throw new Error('Install glslang or set GLSLANG_VALIDATOR to its executable.');
    if(result.status!==0)throw new Error(result.stdout+result.stderr);
    console.log(name+': GLSL ES compilation/link passed');
  }
} finally {rmSync(directory,{recursive:true,force:true});}
