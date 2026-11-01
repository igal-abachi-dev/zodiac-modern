export type Phase = 'ready' | 'running' | 'success' | 'canceled';
export interface Workflow {phase: Phase; progress: number; generation: number}
export const initialWorkflow = (): Workflow => ({phase:'ready',progress:0,generation:0});
export type Action = {type:'start'|'cancel'|'reset'} | {type:'advance'; generation:number; elapsed:number};
export function workflow(state:Workflow, action:Action):Workflow {
  switch(action.type) {
    case 'start': return state.phase==='running'?state:{phase:'running',progress:0,generation:state.generation+1};
    case 'cancel': return state.phase==='running'?{...state,phase:'canceled',generation:state.generation+1}:state;
    case 'reset': return {...initialWorkflow(),generation:state.generation+1};
    case 'advance':
      if(state.phase!=='running'||action.generation!==state.generation||!Number.isFinite(action.elapsed))return state;
      return {...state,phase:action.elapsed>=2000?'success':'running',progress:Math.max(state.progress,Math.min(100,Math.max(0,Math.floor(action.elapsed/20))))};
  }
}
export interface Row {id:number; value:number}
export interface Rows {rows:Row[]; next:number; tick:number; query:string}
export const label=(row:Row)=>`row-${row.id} שלום`;
export function replace(state:Rows,count:number):Rows {
  if(!Number.isInteger(count)||count<0||count>10000)throw new RangeError('Row bound');
  return {...state,rows:Array.from({length:count},(_,i)=>({id:state.next+i,value:0})),next:state.next+count,tick:0};
}
export const initialRows=():Rows=>replace({rows:[],next:0,tick:0,query:''},1000);
export const reverse=(s:Rows):Rows=>({...s,rows:[...s.rows].reverse()});
export const splice=(s:Rows):Rows=>({...s,rows:[...Array.from({length:10},(_,i)=>({id:s.next+i,value:0})),...s.rows.slice(10)],next:s.next+10});
export const update=(s:Rows):Rows=>({...s,rows:s.rows.map((r,i)=>i%10===0?{...r,value:r.value+1}:r),tick:s.tick+1});
export const filtered=(s:Rows)=>s.rows.filter(row=>label(row).includes(s.query));
