import {BOUNDS,loadTerrain} from './terrain.js';
import {adjustedRainfall,summarize,indexAt} from './model.js';
import {loadPoints,savePoints,validCoordinate} from './points.js';

const $=id=>document.getElementById(id),fmt=(n,p=1)=>Number(n).toFixed(p);
const points=loadPoints(),markers=new Map();
const state={terrain:null,frames:[],worker:null,busy:false,runId:0,overlay:null,complete:false};
if(typeof L==='undefined'){
  document.body.innerHTML='<p style="padding:30px;font-family:sans-serif">Leaflet 지도 라이브러리를 불러오지 못했습니다. 네트워크를 확인하세요.</p>';
  throw Error('Leaflet CDN unavailable');
}
const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([35.847,128.534],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
map.fitBounds(L.latLngBounds([BOUNDS[0],BOUNDS[1]],[BOUNDS[2],BOUNDS[3]]),{padding:[20,20]});
function scenario(){return {
  temperature:Number($('temperature').value),rain:Number($('rain').value),duration:Number($('duration').value),
  sensitivity:Number($('sensitivity').value),loss:Number($('loss').value),threshold:Number($('threshold').value)
};}
function setStatus(msg,error=false){$('loading').textContent=msg;$('loading').classList.toggle('error',error);}
function icon(i,kind='ready'){
  const cls=kind==='flood'?'flood':kind==='unknown'?'unknown':'';
  return L.divIcon({className:'',html:'<div class="site-marker '+cls+'">'+(i+1)+'</div>',iconSize:[26,26],iconAnchor:[13,13]});
}
function popup(p,i){
  const div=document.createElement('div');div.style.cssText='line-height:1.8;min-width:175px';
  const title=document.createElement('b');title.textContent=(i+1)+'. '+p.name;
  const kind=document.createElement('div');kind.textContent=p.type+' · '+p.verified;
  const coords=document.createElement('code');coords.textContent=fmt(p.lat,5)+', '+fmt(p.lon,5);
  const tip=document.createElement('p');tip.style.cssText='font-size:11px;color:#75899c';tip.textContent='좌표를 직접 보정하려면 마커를 드래그하세요. 초기 위치는 잠정값입니다.';
  div.append(title,kind,coords,tip);return div;
}
points.forEach((p,i)=>{
  const m=L.marker([p.lat,p.lon],{icon:icon(i),title:p.name,draggable:true,autoPan:true}).addTo(map);
  m.bindTooltip(p.name,{direction:'top',offset:[0,-10],className:'site-tip'});m.bindPopup(popup(p,i));
  markers.set(p.id,m);
  m.on('dragend',()=>{
    const {lat,lng}=m.getLatLng();if(!validCoordinate(lat,lng)){m.setLatLng([p.lat,p.lon]);setStatus('분석 지역 밖의 좌표는 저장할 수 없습니다.',true);return;}
    p.lat=lat;p.lon=lng;p.verified='사용자 지정';savePoints(points);m.setPopupContent(popup(p,i));updateGeoStatus();updateCards();if(state.complete)updateFrame();
  });
});
function updateGeoStatus(){
  $('geo-status').textContent=points.filter(p=>p.verified!=='잠정 좌표').length+'/8 보정됨';
}
function updateControls(){
  const s=scenario(),adjusted=adjustedRainfall(s.rain,s.temperature,s.sensitivity);
  $('temperature-out').textContent='+'+fmt(s.temperature)+' °C';
  $('rain-out').textContent=s.rain+' mm/h';$('duration-out').textContent=s.duration+' 시간';
  $('sensitivity-out').textContent=s.sensitivity+' %/°C';$('loss-out').textContent=s.loss+' mm/h';
  $('threshold-out').textContent=fmt(s.threshold,2)+' m';
  $('adjusted-rain').textContent=fmt(adjusted)+' mm/h';$('rain-delta').textContent='+'+fmt((adjusted/s.rain-1)*100)+'%';
  if(state.complete)resetResult('시나리오가 변경되었습니다. 다시 계산해 주세요.');
}
['temperature','rain','duration','sensitivity','loss','threshold'].forEach(id=>$(id).addEventListener('input',updateControls));
function resetResult(message='시뮬레이션을 실행하세요.'){
  state.frames=[];state.complete=false;$('time').disabled=true;$('time').value=0;
  $('time-out').textContent='미계산';$('flooded-count').textContent='—';$('max-depth').textContent='—';
  $('flooded-area').textContent='—';$('sim-state').textContent='대기 중';
  $('map-layer-status').textContent='— 계산 전';
  if(state.overlay){map.removeLayer(state.overlay);state.overlay=null;}
  updateCards();setStatus(message);
}
function depthAt(p){
  const frame=state.frames[Number($('time').value)];if(!state.terrain||!frame)return null;
  const t=state.terrain,index=indexAt(p.lat,p.lon,t.bounds,t.width,t.height);
  return index<0?null:frame.depths[index];
}
function updateCards(){
  const container=$('point-list');container.replaceChildren();const threshold=scenario().threshold;
  points.forEach((p,i)=>{
    const d=depthAt(p),kind=d===null?(state.complete?'unknown':'ready'):(d>=threshold?'flood':'ready');
    const m=markers.get(p.id);m.setIcon(icon(i,kind));
    if($('show-points').checked&&!map.hasLayer(m))m.addTo(map);
    if(!$('show-points').checked&&map.hasLayer(m))map.removeLayer(m);
    const card=document.createElement('button');card.type='button';card.className='point-card';
    const top=document.createElement('div');top.className='point-card-top';
    const number=document.createElement('span');number.className='point-number';number.textContent=String(i+1).padStart(2,'0');
    const title=document.createElement('span');title.className='point-title';title.textContent=p.name;top.append(number,title);
    const bottom=document.createElement('div');bottom.className='point-card-bottom';
    const v=document.createElement('span');v.textContent=p.verified==='잠정 좌표'?'위치 미검증':'위치 보정됨';
    const value=document.createElement('strong');value.className=kind==='flood'?'flood':kind==='ready'?'ok':'';
    value.textContent=d===null?'미계산':fmt(d,2)+' m · '+(d>=threshold?'침수':'미침수');bottom.append(v,value);
    card.append(top,bottom);card.addEventListener('click',()=>{
      map.flyTo([p.lat,p.lon],Math.max(map.getZoom(),14),{duration:.5});
      if(!$('show-points').checked){$('show-points').checked=true;updateCards();}
      m.openPopup();
    });container.append(card);
  });
}
function rasterUrl(depths,width,height,threshold){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),image=c.createImageData(width,height);
  for(let i=0;i<depths.length;i++){
    const depth=depths[i];if(depth<threshold)continue;
    const t=Math.min(1,Math.max(0,(depth-threshold)/.9)),k=i*4;
    image.data[k]=Math.round(146-137*t);image.data[k+1]=Math.round(205-115*t);
    image.data[k+2]=Math.round(248-88*t);image.data[k+3]=Math.round(135+70*t);
  }
  c.putImageData(image,0,0);return canvas.toDataURL('image/png');
}
function updateFrame(){
  const frame=state.frames[Number($('time').value)];if(!frame||!state.terrain)return;
  const t=state.terrain,threshold=scenario().threshold;
  const pointIndices=points.map(p=>indexAt(p.lat,p.lon,t.bounds,t.width,t.height));
  const result=summarize(frame.depths,threshold,t.dx,t.dy,pointIndices);
  $('time-out').textContent=fmt(frame.minute/60,2)+' h';
  $('flooded-count').textContent=result.floodedSites;
  $('max-depth').textContent=fmt(result.maxDepth,2);
  $('flooded-area').textContent=fmt(result.floodedAreaKm2,2);
  $('sim-state').textContent='계산 완료';
  $('map-layer-status').textContent='— '+result.floodedCells.toLocaleString('ko-KR')+'개 격자';
  updateCards();
  if(state.overlay){map.removeLayer(state.overlay);state.overlay=null;}
  if($('show-flood').checked){
    const img=rasterUrl(frame.depths,t.width,t.height,threshold);
    state.overlay=L.imageOverlay(img,[[t.bounds[0],t.bounds[1]],[t.bounds[2],t.bounds[3]]],{opacity:.75,interactive:false}).addTo(map);
  }
}
$('time').addEventListener('input',updateFrame);
$('show-flood').addEventListener('change',()=>{if(state.complete)updateFrame();});
$('show-points').addEventListener('change',updateCards);
function setRunning(running){state.busy=running;$('run').disabled=running;$('run-label').textContent=running?'수리계산 실행 중…':'시뮬레이션 실행';}
async function initializeTerrain(){
  if(state.busy)return;state.busy=true;$('run').disabled=true;$('run-label').textContent='고도자료 불러오는 중…';
  try{
    const t=await loadTerrain((done,total)=>setStatus('실제 지형 고도자료 로딩 중: '+done+'/'+total+' 타일'));
    state.terrain=t;$('dem-status').textContent='Mapzen 고도 데이터 준비';
    $('resolution').textContent='약 '+t.resolution+' m 격자';
    setStatus('고도 데이터가 준비되었습니다. 시나리오를 실행하세요.');
    $('run').onclick=runSimulation;
  }catch(err){
    state.terrain=null;$('dem-status').textContent='고도자료 연결 실패';
    setStatus('고도 데이터를 불러오지 못했습니다: '+err.message+' 다시 시도하세요.',true);
    $('run-label').textContent='고도자료 다시 시도';$('run').onclick=initializeTerrain;
  }finally{
    state.busy=false;$('run').disabled=false;if(state.terrain)$('run-label').textContent='시뮬레이션 실행';
  }
}
function runSimulation(){
  if(state.busy||!state.terrain)return;
  resetResult();setRunning(true);setStatus('수리 계산 실행 중…');$('sim-state').textContent='연산 중';
  if(state.worker)state.worker.terminate();
  const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  state.worker=worker;const id=++state.runId,s=scenario(),t=state.terrain;
  worker.onmessage=({data})=>{
    if(id!==state.runId)return;
    worker.terminate();state.worker=null;setRunning(false);
    if(data.type==='error'){$('sim-state').textContent='계산 실패';setStatus(data.message,true);return;}
    state.frames=data.frames;state.complete=true;
    $('time').min=0;$('time').max=state.frames.length-1;$('time').step=1;$('time').value=state.frames.length-1;$('time').disabled=false;
    updateFrame();setStatus('계산 완료: '+state.frames.length+'개 시간 구간. 시간 슬라이더를 움직여 결과를 확인할 수 있습니다.');
  };
  worker.onerror=err=>{
    if(id!==state.runId)return;worker.terminate();state.worker=null;setRunning(false);
    $('sim-state').textContent='계산 실패';setStatus('계산 오류: '+err.message,true);
  };
  worker.postMessage({type:'run',id,
    terrain:{elevation:t.elevation,width:t.width,height:t.height,dx:t.dx,dy:t.dy},
    scenario:{rainMmH:adjustedRainfall(s.rain,s.temperature,s.sensitivity),
      lossMmH:s.loss,durationHours:s.duration,intervalMinutes:15,stepSeconds:60,manningN:.075}});
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function geocode(){
  const button=$('geocode');button.disabled=true;
  let checked=0,updated=0;
  for(const [i,p] of points.entries()){
    if(p.verified==='사용자 지정'||p.type==='산 정상')continue;
    try{
      $('geocode-note').textContent='OpenStreetMap 좌표 검색 '+(i+1)+'/8: '+p.name;
      const url=new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q',p.query);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','3');url.searchParams.set('accept-language','ko');
      const res=await fetch(url.toString(),{headers:{Accept:'application/json'}});
      if(!res.ok)throw Error('HTTP '+res.status);
      const records=await res.json(),match=records.find(item=>validCoordinate(Number(item.lat),Number(item.lon)));
      if(match){
        p.lat=Number(match.lat);p.lon=Number(match.lon);
        p.verified='OSM 검색 결과(수동 확인 필요)';
        markers.get(p.id).setLatLng([p.lat,p.lon]);markers.get(p.id).setPopupContent(popup(p,i));updated++;
      }
      checked++;
    }catch(err){console.warn('OSM 지오코딩 실패',p.id,err);}
    await sleep(1150); // Respect public Nominatim 1 request per second policy
  }
  savePoints(points);updateGeoStatus();updateCards();if(state.complete)updateFrame();
  $('geocode-note').textContent='검색 응답 '+checked+'건, 위치 변경 '+updated+'건. 건물과 정상 실제 GPS 위치는 별도 확인이 필요합니다.';
  button.disabled=false;
}
$('geocode').addEventListener('click',geocode);
updateGeoStatus();updateCards();updateControls();initializeTerrain();
