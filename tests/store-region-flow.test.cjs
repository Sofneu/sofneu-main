const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rules = require('../assets/store-region-rules.js');
const source = fs.readFileSync(require.resolve('../assets/store-region-prompt.js'), 'utf8');
function setup(options = {}) {
  const storage = () => { const data = new Map(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; };
  const listeners = {}, timers = [], nodes = new Map();
  const dialog = {open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener:(name,fn)=>listeners['dialog:'+name]=fn};
  const root = {dataset:{themeRole:options.role || 'development',currentStore:options.store || 'AU',auUrl:'https://sofneu.com.au/',usUrl:'https://sofneu.com/',second:'true',analytics:options.analytics ? 'true':'false'},
    querySelector(selector){if(selector==='dialog') return dialog; if(!nodes.has(selector)) nodes.set(selector,{});return nodes.get(selector);},
    querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn};
  const document = {activeElement:{focus(){}},documentElement:{clientWidth:390,clientHeight:844},
    getElementById:()=>root,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
  const events = [];
  const window = {SofneuRegionRules:rules,localStorage:storage(),sessionStorage:storage(),
    Shopify:{customerPrivacy:{analyticsProcessingAllowed:()=>options.consent===true},analytics:{publish:(name,data)=>{
      if(options.throwPublish) throw new Error('analytics unavailable');
      events.push({name,data});return Promise.resolve();
    }}}};
  window.sessionStorage.setItem('sofneu.region.ip.v1',JSON.stringify({country:options.country || 'US',until:Date.now()+60000}));
  if(options.storageUnavailable) Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}});
  if(options.sessionWriteFails) window.sessionStorage.setItem=()=>{throw new Error('storage full');};
  if(options.lookupFails) window.sessionStorage.removeItem('sofneu.region.ip.v1');
  vm.runInNewContext(source,{document,window,URL,Date,Promise,AbortController,fetch:async()=>{throw new Error('lookup blocked');},location:{href:'http://localhost/?srp_test=US'},setTimeout:fn=>{timers.push(fn);return 1;},clearTimeout(){}});
  while(timers.length) timers.shift()();
  const click = action => listeners.click({target:{closest:selector=>selector==='a[href]'?{href:nodes.get('[data-srp-action="switch"]').href}:{dataset:{srpAction:action}}},preventDefault(){}});
  return {window,dialog,events,click,cancel:()=>listeners['dialog:cancel']({preventDefault(){}})};
}
const productForm={checkValidity:()=>true};
const quickAddForm={checkValidity:()=>true};
for(const [first,second,label] of [[productForm,quickAddForm,'product then quick add'],[quickAddForm,productForm,'quick add then product']]) {
  test(label+': one shared confirmation; stay resumes exactly the pending operation',async()=>{
    const s=setup();assert.equal(s.dialog.open,true);s.click('dismiss');
    const firstResult=s.window.SofneuRegionPrompt.beforeAdd(first);
    assert.equal(s.dialog.open,true);
    assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(second),false);
    s.click('stay');assert.equal(await firstResult,true);
    assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(second),true);
    assert.equal(s.dialog.open,false);
  });
}
test('switch cancels the pending add and preserves native navigation',async()=>{
  const s=setup();s.click('dismiss');const result=s.window.SofneuRegionPrompt.beforeAdd(productForm);
  s.click('switch');assert.equal(await result,false);
});
test('Escape on the second prompt resumes once and does not prompt in the other area',async()=>{
  const s=setup();s.click('dismiss');const result=s.window.SofneuRegionPrompt.beforeAdd(quickAddForm);
  s.cancel();assert.equal(await result,true);
  assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(productForm),true);assert.equal(s.dialog.open,false);
});
test('an explicit stay on entry suppresses both add-area confirmations',async()=>{
  const s=setup();s.click('stay');
  assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(productForm),true);
  assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(quickAddForm),true);assert.equal(s.dialog.open,false);
});
test('invalid selections do not consume the first valid add confirmation',async()=>{
  const s=setup();s.click('dismiss');
  assert.equal(await s.window.SofneuRegionPrompt.beforeAdd({checkValidity:()=>false}),true);
  const result=s.window.SofneuRegionPrompt.beforeAdd(productForm);assert.equal(s.dialog.open,true);
  s.click('stay');assert.equal(await result,true);
});
test('popup flow never calls Shopify analytics or consent interfaces',async()=>{
  for(const store of ['AU','US']) {
    const s=setup({role:'main',store,country:store==='AU'?'US':'NZ',analytics:true,consent:true,throwPublish:true});
    Object.defineProperty(s.window.Shopify,'customerPrivacy',{get(){throw new Error('consent must stay untouched');}});
    s.click('dismiss');const result=s.window.SofneuRegionPrompt.beforeAdd(productForm);s.click('stay');
    assert.equal(await result,true);assert.equal(s.events.length,0);
  }
});
test('matching and unrecognized regions never open either prompt',async()=>{
  for(const [store,country] of [['AU','AU'],['AU','NZ'],['US','US'],['AU','CN'],['US','GB'],['AU','OTHER']]) {
    const s=setup({role:'main',store,country});assert.equal(s.dialog.open,false);
    assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(productForm),true);assert.equal(s.dialog.open,false);
  }
});
test('blocked or full browser storage disables the recommendation safely',()=>{
  for(const options of [{storageUnavailable:true},{sessionWriteFails:true}]) {
    const s=setup(options);assert.equal(s.window.SofneuRegionPrompt,undefined);assert.equal(s.dialog.open,false);
  }
});
test('lookup failure leaves ordinary shopping available',async()=>{
  const s=setup({role:'main',lookupFails:true});await new Promise(setImmediate);
  assert.equal(s.dialog.open,false);assert.equal(await s.window.SofneuRegionPrompt.beforeAdd(productForm),true);
});
