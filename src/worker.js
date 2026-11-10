import {simulate} from './model.js';
self.onmessage=({data})=>{
  if(data?.type!=='run')return;
  const {id,terrain,scenario}=data;
  try{
    const frames=simulate({...terrain,...scenario});
    self.postMessage({type:'done',id,frames},frames.map(f=>f.depths.buffer));
  }catch(err){self.postMessage({type:'error',id,message:err.message||String(err)});}
};