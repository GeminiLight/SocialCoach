"""Read the application's sole pigment source (OKLCH CSS) for Blender materials."""
import math,pathlib,re

def pigments():
 css=(pathlib.Path(__file__).parents[2]/'src/app/globals.css').read_text();result={}
 for name,L,C,H in re.findall(r'--dinner-scene-(\w+): oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)',css):
  L,C,H=float(L),float(C),float(H)*math.pi/180;a=C*math.cos(H);b=C*math.sin(H)
  l=(L+.3963377774*a+.2158037573*b)**3;m=(L-.1055613458*a-.0638541728*b)**3;s=(L-.0894841775*a-1.291485548*b)**3
  result[name]=tuple(max(0,min(1,v)) for v in (4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s))
 return result
