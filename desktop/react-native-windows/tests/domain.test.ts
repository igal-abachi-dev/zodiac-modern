import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkflow,workflow,initialRows,replace,reverse,splice,update,filtered} from '../src/domain.ts';
test('generation-aware progress and cancellation',()=>{
  let state=workflow(initialWorkflow(),{type:'start'});const generation=state.generation;
  state=workflow(state,{type:'advance',generation,elapsed:500});assert.equal(state.progress,25);
  state=workflow(state,{type:'cancel'});assert.equal(workflow(state,{type:'advance',generation,elapsed:2000}),state);
  state=workflow(workflow(state,{type:'reset'}),{type:'start'});
  assert.equal(workflow(state,{type:'advance',generation:state.generation,elapsed:NaN}),state);
  state=workflow(state,{type:'advance',generation:state.generation,elapsed:2000});assert.equal(state.phase,'success');assert.equal(state.progress,100);
});
test('canonical row sequence, filtering and remount',()=>{
  let state=initialRows();assert.equal(state.rows[0]!.id,0);
  state=replace(state,10000);assert.equal(state.rows[9999]!.id,10999);
  state=reverse(replace(state,1000));assert.equal(state.rows[0]!.id,11999);
  state=update(splice(state));assert.equal(state.rows[0]!.id,12000);assert.equal(state.rows[0]!.value,1);assert.equal(state.rows[1]!.value,0);
  assert.equal(filtered({...state,query:'row-12000 '}).length,1);assert.equal(filtered({...state,query:'absent'}).length,0);
  assert.equal(initialRows().tick,0);assert.throws(()=>replace(state,10001),RangeError);
});
