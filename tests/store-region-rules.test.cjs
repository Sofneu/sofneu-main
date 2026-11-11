const test = require('node:test');
const assert = require('node:assert/strict');
const r = require('../assets/store-region-rules.js');
test('only AU/NZ/US mismatches prompt; unknown/other/matched stores never prompt', () => {
  assert.deepEqual(r.recommendation('NZ','US'),{store:'AU',country:'NZ'});
  assert.deepEqual(r.recommendation('AU','US'),{store:'AU',country:'AU'});
  assert.deepEqual(r.recommendation('US','AU'),{store:'US',country:'US'});
  for (const country of ['CN','GB','CA','',null,undefined,'XX','au']) {
    for (const store of ['AU','US']) assert.equal(r.recommendation(country,store),null);
  }
  for (const [country,store] of [['AU','AU'],['NZ','AU'],['US','US'],['US','invalid']])
    assert.equal(r.recommendation(country,store),null);
});
test('second prompt requires soft dismissal and a valid ordinary add; failures release shopping', () => {
  const base={enabled:true,secondEnabled:true,mismatch:true,storageAvailable:true,firstDismissed:true,validForm:true};
  assert.equal(r.beforeAdd(base),true);
  for (const name of ['explicitChoice','secondSeen','pending','quickPayment'])
    assert.equal(r.beforeAdd({...base,[name]:true}),false);
  for (const name of ['enabled','secondEnabled','mismatch','storageAvailable','firstDismissed','validForm'])
    assert.equal(r.beforeAdd({...base,[name]:false}),false);
  assert.equal(r.beforeAdd(null),false);
});
test('cross-store destination drops product/filter/variant state; NZ remains NZ', () => {
  assert.equal(r.destination('https://sofneu.com.au/products/example?variant=123&q=abc#size','NZ'),
    'https://sofneu.com.au/?country=NZ');
  for(const url of ['javascript:alert(1)','http://sofneu.com','https://user:pass@sofneu.com','https://sofneu.com:9000'])
    assert.equal(r.destination(url,'US'),null);
  assert.equal(r.destination('https://sofneu.com','CN'),null);
});
test('closed offscreen cart and discount drawers never block the region prompt', () => {
  const viewport={w:1072,h:827};
  assert.equal(r.intersectsViewport({left:1072,right:1572,top:0,bottom:827,width:500,height:827},viewport.w,viewport.h),false);
  assert.equal(r.intersectsViewport({left:1072,right:1572,top:827,bottom:1007,width:500,height:180},viewport.w,viewport.h),false);
  assert.equal(r.intersectsViewport({left:0,right:0,top:0,bottom:0,width:0,height:0},viewport.w,viewport.h),false);
  assert.equal(r.intersectsViewport({left:572,right:1072,top:0,bottom:827,width:500,height:827},viewport.w,viewport.h),true);
});
