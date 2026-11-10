// Coordinates are rough anchors, not surveyed/verified campus or mountain summit centroids.
export const POINTS=[
{id:'daegeon',name:'대건고등학교',type:'학교',lat:35.8239,lon:128.5314,query:'대건고등학교 대구광역시 달서구 월곡로94길 46'},
{id:'wolseong',name:'월성편한세상',type:'공동주택',lat:35.8255,lon:128.5360,query:'e편한세상월배 대구광역시 달서구 월성로 132'},
{id:'haksan',name:'학산 정상',type:'산 정상',lat:35.8267,lon:128.5215,query:'학산공원 대구광역시 달서구 월성동'},
{id:'daewon',name:'대원고등학교',type:'학교',lat:35.8040,lon:128.5045,query:'대원고등학교 대구광역시 달성군 화원읍 비슬로 2658'},
{id:'wolgwang',name:'월광수변공원',type:'공원',lat:35.8009,lon:128.5460,query:'월광수변공원 대구광역시 달서구 도원동'},
{id:'keimyung',name:'계명대학교',type:'대학교',lat:35.8542,lon:128.4882,query:'계명대학교 성서캠퍼스 대구광역시 달서구 달구벌대로 1095'},
{id:'waryong',name:'와룡산',type:'산 정상',lat:35.8891,lon:128.4971,query:'와룡산 대구광역시 달서구'},
{id:'jangdong',name:'장동초등학교',type:'학교',lat:35.8420,lon:128.5300,query:'대구장동초등학교 대구광역시 달서구 달구벌대로304길 112'}];
export function validCoordinate(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=35.72&&lat<=35.99&&lon>=128.35&&lon<=128.75;}
export function loadPoints(){let saved={};try{saved=JSON.parse(localStorage.getItem('dalflood-sites-v1')||'{}');}catch{}
  return POINTS.map(p=>{const v=saved[p.id];return v&&validCoordinate(v.lat,v.lon)?{...p,lat:v.lat,lon:v.lon,verified:v.verified||'사용자 지정'}:{...p,verified:'잠정 좌표'};});}
export function savePoints(points){const saved={};for(const p of points)saved[p.id]={lat:p.lat,lon:p.lon,verified:p.verified};localStorage.setItem('dalflood-sites-v1',JSON.stringify(saved));}