/** Simplified conservative 4-neighbour diffusion-wave overland-flow model.
 * Educational scenario analysis ONLY. No calibrated 2D hydraulics, pipes, river levels or buildings.
 * Elevation/depth metres; distance metres; time seconds.
 */
export function adjustedRainfall(baseMmPerHour,warmingC,sensitivityPercentPerC){
  if(![baseMmPerHour,warmingC,sensitivityPercentPerC].every(Number.isFinite)||baseMmPerHour<0||sensitivityPercentPerC<0)throw Error('유효하지 않은 매개변수');
  return baseMmPerHour*Math.pow(1+sensitivityPercentPerC/100,warmingC);
}
export function indexAt(lat,lon,bounds,width,height){
  const [s,w,n,e]=bounds;const x=Math.floor((lon-w)/(e-w)*width),y=Math.floor((n-lat)/(n-s)*height);
  return x>=0&&x<width&&y>=0&&y<height?y*width+x:-1;
}
export function summarize(depths,threshold,dx,dy,siteIndices=[]){
  let cells=0,max=0;
  for(const d of depths){if(!Number.isFinite(d)||d<0)continue;if(d>=threshold)cells++;if(d>max)max=d;}
  const siteDepths=siteIndices.map(i=>Number.isInteger(i)&&i>=0&&i<depths.length&&Number.isFinite(depths[i])?depths[i]:null);
  return {floodedCells:cells,maxDepth:max,floodedAreaKm2:cells*dx*dy/1e6,siteDepths,floodedSites:siteDepths.filter(d=>d!==null&&d>=threshold).length};
}
export function simulate({elevation,width,height,dx,dy,rainMmH,lossMmH,durationHours,intervalMinutes=15,stepSeconds=60,manningN=.075}){
  if(width<3||height<3||elevation.length!==width*height||dx<=0||dy<=0||durationHours<=0||durationHours>12||stepSeconds<=0||manningN<=0)throw Error('격자 또는 시간 조건이 잘못되었습니다');
  if(!Array.from(elevation).every(Number.isFinite))throw Error('고도 결측값이 있습니다');
  const n=width*height,w=new Float32Array(n),delta=new Float32Array(n),right=new Float32Array(n),down=new Float32Array(n),out=new Float32Array(n);
  const frames=[],steps=Math.ceil(durationHours*3600/stepSeconds),interval=Math.max(1,Math.round(intervalMinutes*60/stepSeconds));
  const rain=Math.max(0,rainMmH-lossMmH)/3600000;
  function frame(minute){frames.push({minute,depths:w.slice()});}frame(0);
  for(let s=1;s<=steps;s++){
    const dt=Math.min(stepSeconds,durationHours*3600-(s-1)*stepSeconds);if(dt<=0)break;
    for(let i=0;i<n;i++){w[i]+=rain*dt;delta[i]=0;right[i]=0;down[i]=0;out[i]=0;}
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;
      if(x<width-1){
        const j=i+1,head=elevation[i]+w[i]-elevation[j]-w[j];
        if(Math.abs(head)>1e-7){const donor=head>0?i:j;const h=Math.max(0,elevation[donor]+w[donor]-Math.max(elevation[i],elevation[j]));
          const flow=Math.min(w[donor],dt/dx/manningN*Math.pow(h,5/3)*Math.sqrt(Math.abs(head)/dx));
          right[i]=head>0?flow:-flow;out[donor]+=flow;}
      }
      if(y<height-1){
        const j=i+width,head=elevation[i]+w[i]-elevation[j]-w[j];
        if(Math.abs(head)>1e-7){const donor=head>0?i:j;const h=Math.max(0,elevation[donor]+w[donor]-Math.max(elevation[i],elevation[j]));
          const flow=Math.min(w[donor],dt/dy/manningN*Math.pow(h,5/3)*Math.sqrt(Math.abs(head)/dy));
          down[i]=head>0?flow:-flow;out[donor]+=flow;}
      }
    }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;
      if(x<width-1){const j=i+1,f=right[i];if(f){const donor=f>0?i:j,amount=f*Math.min(1,w[donor]/out[donor]);delta[i]-=amount;delta[j]+=amount;}}
      if(y<height-1){const j=i+width,f=down[i];if(f){const donor=f>0?i:j,amount=f*Math.min(1,w[donor]/out[donor]);delta[i]-=amount;delta[j]+=amount;}}
    }
    for(let i=0;i<n;i++)w[i]=Math.max(0,w[i]+delta[i]);
    // Open domain boundary; outflow that leaves domain is not tracked outside.
    for(let x=0;x<width;x++){w[x]=0;w[(height-1)*width+x]=0;}
    for(let y=0;y<height;y++){w[y*width]=0;w[y*width+width-1]=0;}
    if(s%interval===0||s===steps)frame(Math.min(durationHours*60,s*stepSeconds/60));
  }
  return frames;
}