const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/sofneu-tights-size-guide.js'), 'utf8');
function setup(store, columns=3) {
  const classes = new Set(['stsg-unit-metric-active']);
  const button = () => ({setAttribute(k,v){this[k]=v;}});
  const metric=button(), imperial=button();
  const switcher={children:[metric,imperial],get firstChild(){return this.children[0]},insertBefore(n){this.children=this.children.filter(x=>x!==n);this.children.unshift(n)}};
  metric.parentNode=imperial.parentNode=switcher;
  const rows=['US','AU / NZ','UK'].map(label=>({querySelector:()=>({textContent:label}),values:Array(columns).fill('unchanged')}));
  const body={rows:[...rows],get firstChild(){return this.rows[0]},insertBefore(n){this.rows=this.rows.filter(x=>x!==n);this.rows.unshift(n)}};
  const guide={nodeType:1,classList:{contains:k=>classes.has(k),add:(...a)=>a.forEach(k=>classes.add(k)),remove:(...a)=>a.forEach(k=>classes.delete(k))},
    matches:s=>s==='.sofneu-tights-size-guide',closest:s=>s==='[data-sofneu-tights-store]'?(store?{getAttribute:()=>store}:null):guide,
    querySelector:s=>({'.stsg-unit-metric':metric,'.stsg-unit-imperial':imperial,'.stsg-unit-switch':switcher}[s]||null),
    querySelectorAll:s=>s.includes('tbody')?[body]:[]};
  const listeners={};let observer;
  const document={readyState:'complete',documentElement:{},querySelectorAll:()=>[guide],addEventListener:(k,v)=>listeners[k]=v};
  vm.runInNewContext(source,{document,WeakSet,MutationObserver:class{constructor(cb){observer=cb}observe(){}}});
  return {classes,metric,imperial,switcher,body,rows,reinsert:()=>observer([{addedNodes:[guide]}]),clickImperial:()=>listeners.pointerdown({target:{closest:s=>s==='.sofneu-tights-size-guide'?guide:s==='.stsg-unit-imperial'?imperial:null}})};
}
test('US overrides existing metric HTML and puts imperial first',()=>{
 const s=setup('US');assert(s.classes.has('stsg-unit-imperial-active'));assert(!s.classes.has('stsg-unit-metric-active'));
 assert.equal(s.switcher.children[0],s.imperial);assert.equal(s.imperial['aria-pressed'],'true');assert.equal(s.body.rows[0],s.rows[0]);
});
test('AU defaults metric with AU/NZ first and preserves every measurement cell',()=>{
 for(const n of [2,3,4]){const s=setup('AU',n);assert(s.classes.has('stsg-unit-metric-active'));assert.equal(s.switcher.children[0],s.metric);assert.equal(s.body.rows[0],s.rows[1]);assert(s.body.rows.every(r=>r.values.length===n&&r.values.every(v=>v==='unchanged')));}
});
test('manual unit choice survives popup reinsertion',()=>{
 const s=setup('AU');s.clickImperial();assert(s.classes.has('stsg-unit-imperial-active'));s.reinsert();assert(s.classes.has('stsg-unit-imperial-active'));assert.equal(s.imperial['aria-pressed'],'true');
});
test('unmarked legacy and unknown contexts keep previous initialization and row order',()=>{
 for(const store of [null,'OTHER']){const s=setup(store);assert(s.classes.has('stsg-unit-metric-active'));assert.equal(s.body.rows[0],s.rows[0]);assert.equal(s.switcher.children[0],s.metric);}
});
