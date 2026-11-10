// Mapzen/Terrain Tiles PNG: elevation(m) = R*256 + G + B/256 - 32768.
export const BOUNDS=[35.785,128.435,35.927,128.655];
export const GRID={width:220,height:180,zoom:12};
const HOSTS=['https://s3.amazonaws.com/elevation-tiles-prod/terrarium','https://elevation-tiles-prod.s3.amazonaws.com/terrarium'];
export function tileCoordinates(lat,lon,z){
  const n=2**z,rad=Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180;
  return {x:(lon+180)/360*n,y:(1-Math.asinh(Math.tan(rad))/Math.PI)/2*n};
}
export function decodeElevation(r,g,b){return r*256+g+b/256-32768;}
async function tile(x,y,z){
  let last;
  for(const base of HOSTS){
    try{
      const response=await fetch(base+'/'+z+'/'+x+'/'+y+'.png');
      if(!response.ok)throw Error('HTTP '+response.status);
      const bitmap=await createImageBitmap(await response.blob());
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(bitmap,0,0);bitmap.close();
      if(canvas.width!==256||canvas.height!==256)throw Error('유효하지 않은 고도 타일');
      return c.getImageData(0,0,256,256).data;
    }catch(e){last=e;}
  }
  throw Error('고도 타일 다운로드 실패 '+x+','+y+': '+(last?.message||'네트워크 오류'));
}
export async function loadTerrain(progress){
  const {width,height,zoom}=GRID,[s,w,n,e]=BOUNDS;
  const nw=tileCoordinates(n,w,zoom),se=tileCoordinates(s,e,zoom);
  const queue=[];for(let y=Math.floor(nw.y);y<=Math.floor(se.y);y++)for(let x=Math.floor(nw.x);x<=Math.floor(se.x);x++)queue.push({x,y});
  const tiles=new Map();let count=0;
  for(let i=0;i<queue.length;i+=3){await Promise.all(queue.slice(i,i+3).map(async ({x,y})=>{
    tiles.set(x+'/'+y,await tile(x,y,zoom));progress?.(++count,queue.length);
  }));}
  const elevation=new Float32Array(width*height);
  for(let row=0;row<height;row++){
    const lat=n-(row+.5)*(n-s)/height;
    for(let col=0;col<width;col++){
      const lon=w+(col+.5)*(e-w)/width,p=tileCoordinates(lat,lon,zoom),x=Math.floor(p.x),y=Math.floor(p.y);
      const data=tiles.get(x+'/'+y);if(!data)throw Error('고도 타일 일부가 누락되었습니다');
      const px=Math.min(255,Math.max(0,Math.floor((p.x-x)*256))),py=Math.min(255,Math.max(0,Math.floor((p.y-y)*256))),k=4*(py*256+px);
      if(!data[k+3])throw Error('결측 고도 픽셀입니다');
      const z=decodeElevation(data[k],data[k+1],data[k+2]);if(!Number.isFinite(z)||z<-500||z>3000)throw Error('비정상 고도값입니다');
      elevation[row*width+col]=z;
    }
  }
  const mid=(s+n)/2*Math.PI/180,dx=(e-w)*111320*Math.cos(mid)/width,dy=(n-s)*111132/height;
  return {elevation,width,height,dx,dy,bounds:BOUNDS,resolution:Math.round(Math.sqrt(dx*dy)),source:'Mapzen Terrain Tiles'};
}