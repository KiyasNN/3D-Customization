
/**
 * Material Engine (WebGL Accelerated)
 * Processes a base image to generate PBR maps (Normal, Roughness, Displacement)
 * using WebGL fragment shaders for high performance.
 */

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y; // Flip Y for proper texture orientation
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_NORMAL = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float strength;

  float getGray(vec2 uv) {
    vec4 color = texture2D(tDiffuse, uv);
    return dot(color.rgb, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec2 step = 1.0 / resolution;
    
    // Sobel Operator for gradients
    float tl = getGray(vUv + vec2(-step.x, -step.y));
    float t  = getGray(vUv + vec2(0.0,     -step.y));
    float tr = getGray(vUv + vec2(step.x,  -step.y));
    float l  = getGray(vUv + vec2(-step.x, 0.0));
    float r  = getGray(vUv + vec2(step.x,  0.0));
    float bl = getGray(vUv + vec2(-step.x, step.y));
    float b  = getGray(vUv + vec2(0.0,     step.y));
    float br = getGray(vUv + vec2(step.x,  step.y));

    float dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
    float dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
    
    // Calculate normal vector
    vec3 normal = normalize(vec3(-dX * strength, -dY * strength, 1.0));
    
    // Pack into 0.0 - 1.0 range
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`;

const FRAGMENT_SHADER_ROUGHNESS = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // High contrast and invert for roughness
    // Assuming dark areas are deeper/rougher in some workflows, 
    // or typically for standard PBR: White = Rough, Black = Smooth.
    // We'll create a contrasty map based on visual intensity.
    float val = (gray - 0.5) * 1.2 + 0.5; // increase contrast
    val = clamp(val, 0.0, 1.0);
    
    gl_FragColor = vec4(vec3(val), 1.0);
  }
`;

const FRAGMENT_SHADER_DISPLACEMENT = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Enhance contrast for displacement
    float val = (gray - 0.5) * 1.5 + 0.5;
    val = clamp(val, 0.0, 1.0);

    gl_FragColor = vec4(vec3(val), 1.0);
  }
`;

// Helper: Compile Shader
const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compile error");
  }
  return shader;
};

// Helper: Create Program
const createProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create program");
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Program link error");
  }
  return program;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const processShader = (
  img: HTMLImageElement, 
  fragmentSource: string, 
  uniforms: Record<string, any> = {}
): string => {
  const canvas = document.createElement('canvas');
  const width = img.width;
  const height = img.height;
  canvas.width = width;
  canvas.height = height;

  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
  if (!gl) throw new Error("WebGL not supported");
  
  // Create Program
  const program = createProgram(gl, VERTEX_SHADER, fragmentSource);
  gl.useProgram(program);

  // Create Buffers (Full screen quad)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]), gl.STATIC_DRAW);

  const positionAttributeLocation = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // Create Texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Set parameters so we can render any size image
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Upload the image into the texture
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  // Set Uniforms
  const resolutionLocation = gl.getUniformLocation(program, "resolution");
  if (resolutionLocation) gl.uniform2f(resolutionLocation, width, height);

  for (const key in uniforms) {
    const loc = gl.getUniformLocation(program, key);
    if (loc) gl.uniform1f(loc, uniforms[key]);
  }

  // Draw
  gl.viewport(0, 0, width, height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  return canvas.toDataURL('image/jpeg', 0.90);
};

export const processPBRMaps = async (imageUrl: string) => {
  const img = await loadImage(imageUrl);
  
  // Resize if too massive (cap at 2048 for texture performance on mobile)
  const maxSize = 2048;
  if (img.width > maxSize || img.height > maxSize) {
    const ratio = img.width / img.height;
    if (img.width > img.height) {
      img.width = maxSize;
      img.height = maxSize / ratio;
    } else {
      img.height = maxSize;
      img.width = maxSize * ratio;
    }
  }

  // Generate maps using WebGL shaders
  const normalMapUrl = processShader(img, FRAGMENT_SHADER_NORMAL, { strength: 2.0 });
  const roughnessMapUrl = processShader(img, FRAGMENT_SHADER_ROUGHNESS);
  const displacementMapUrl = processShader(img, FRAGMENT_SHADER_DISPLACEMENT);

  return {
    normalMapUrl,
    roughnessMapUrl,
    displacementMapUrl,
    aoMapUrl: displacementMapUrl // AO is often similar to height/occlusion
  };
};
