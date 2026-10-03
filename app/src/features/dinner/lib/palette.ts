
// WebGL cannot read OKLCH. CSS remains the only source of color values.
function linear(v: number) { return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055; }
export function oklchToHex(value: string) {
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) {
    // Next's CSS optimizer may emit Lab instead of OKLCH. Let the browser
    // resolve any supported CSS color to sRGB before giving it to Three.js.
    if (!CSS.supports('color',value.trim())) throw new Error('Missing 3D pigment');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const context=canvas.getContext('2d',{willReadFrequently:true})!;
    context.fillStyle=value.trim();context.fillRect(0,0,1,1);
    const rgb=context.getImageData(0,0,1,1).data;
    return '#'+Array.from(rgb.slice(0,3)).map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  const [, ls, cs, hs] = match; const L = +ls, C = +cs, h = +hs * Math.PI / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const lv = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const mv = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const sv = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * lv - 3.3077115913 * mv + .2309699292 * sv, -1.2684380046 * lv + 2.6097574011 * mv - .3413193965 * sv, -.0041960863 * lv - .7034186147 * mv + 1.707614701 * sv];
  return '#' + rgb.map(x => Math.round(Math.max(0, Math.min(1, linear(x))) * 255).toString(16).padStart(2, '0')).join('');
}
export function getPalette() {
  const style = getComputedStyle(document.documentElement);
  const names = ['wall', 'wallInset', 'wood', 'woodEdge', 'floor', 'chair', 'brass', 'porcelain', 'ceramic', 'tea', 'bottle', 'napkin', 'skin', 'skinWarm', 'skinMature', 'skinShadow', 'sclera', 'lip', 'iris', 'hair', 'hairHighlight', 'mouth', 'hairGray', 'clothHighlight', 'navy', 'sage', 'wine', 'charcoal', 'denim', 'oat', 'terracotta', 'teal', 'white', 'leaf', 'stem', 'food', 'green', 'red', 'rice', 'dark', 'light', 'art'] as const;
  return Object.fromEntries(names.map(n => [n, oklchToHex(style.getPropertyValue('--dinner-scene-' + n))])) as Record<typeof names[number], string>;
}
export type Palette = ReturnType<typeof getPalette>;
