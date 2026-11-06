(function () {
  'use strict';
  const root = document.getElementById('sofneu-region-prompt');
  const rules = window.SofneuRegionRules;
  if (root?.dataset.themeRole==='development') root.dataset.srpStatus=!rules?'rules-missing':window.SofneuRegionPrompt?'already-initialized':'initializing';
  if (!root || !rules || window.SofneuRegionPrompt) return;
  const dialog = root.querySelector('dialog');
  if (!dialog?.showModal || root.dataset.designMode === 'true') return;
  const brand = document.querySelector('.wt-header__logo__img:not(.wt-header__logo__img--transparent)');
  if (brand) {
    const image = brand.cloneNode(false);
    image.removeAttribute('id'); image.removeAttribute('srcset');
    image.className = 'srp-logo'; image.width = 100;
    root.querySelector('.srp-logo-host').appendChild(image);
  }
  const store = root.dataset.currentStore;
  const homes = { AU: root.dataset.auUrl, US: root.dataset.usUrl };
  const keys = { choice:'sofneu.region.choice.v1', session:'sofneu.region.session.v1', cache:'sofneu.region.ip.v1' };
  const now = () => Date.now();
  const read = (storage,key) => { try { return JSON.parse(storage.getItem(key)); } catch (_) { return null; } };
  const write = (storage,key,value) => { try { storage.setItem(key,JSON.stringify(value)); return true; } catch (_) { return false; } };
  let local, session;
  try { local=window.localStorage; session=window.sessionStorage; } catch (_) { return; }
  if (!write(session,'sofneu.region.available',true)) return;
  if (root.dataset.themeRole==='development' && new URL(location.href).searchParams.get('srp_reset')==='1') {
    try { local.removeItem(keys.choice); session.removeItem(keys.session); }
    catch (_) { /* Development reset never affects ordinary shopping. */ }
  }
  let state = read(session,keys.session) || {};
  let country, target, pending, opener, stage='entry', userBusy=false;
  const save = () => write(session,keys.session,state);
  const remember = () => { state.explicitChoice=true; save(); write(local,keys.choice,{until:now()+30*86400000}); };
  const explicit = () => state.explicitChoice || (read(local,keys.choice)?.until > now());
  function close(action) {
    if (!dialog.open) return;
    const resume = pending;
    pending=null;
    if (action==='stay') remember();
    if (stage==='entry') state.firstDismissed=true;
    else state.secondSeen=true;
    save();
    dialog.close();
    opener?.focus?.();
    if (resume) resume(true);
  }
  function open(nextStage) {
    if (!target || explicit() || dialog.open) return false;
    stage=nextStage;
    opener=document.activeElement;
    const nz=country==='NZ';
    const name=target.store==='US'?'US':'Australia';
    root.querySelector('[data-srp-eyebrow]').textContent=stage==='pre_add'?'BEFORE YOU ADD TO CART':'A LITTLE CLOSER TO HOME';
    root.querySelectorAll('[data-srp-flag]').forEach(flag=>{flag.hidden=flag.dataset.srpFlag!==country;});
    root.querySelector('#srp-title').textContent=stage==='pre_add'?'Which store works for you?':`Shopping from ${nz?'New Zealand':target.store==='US'?'the US':name}?`;
    root.querySelector('#srp-description').textContent=stage==='pre_add'
      ? `You’re shopping our ${store==='US'?'US':'Australia'} store. Switch stores before adding this item?`
      : nz?'Our Australia store also serves New Zealand. Would you like to shop there?'
      : `Visit our ${name} store to shop in ${target.store==='US'?'USD':'AUD'} and see local delivery options.`;
    root.querySelector('[data-srp-country]').textContent=nz?'Shop New Zealand':`Sofneu ${target.store==='US'?'United States':'Australia'}`;
    root.querySelector('[data-srp-domain]').textContent=new URL(homes[target.store]).hostname;
    root.querySelector('#srp-warning').hidden=stage!=='pre_add';
    root.querySelector('[data-srp-action="switch"]').textContent=nz?'Shop New Zealand':`Go to ${name} store`;
    root.querySelector('[data-srp-action="switch"]').href=menuDestination();
    root.querySelector('[data-srp-action="stay"]').textContent=stage==='pre_add'?'Stay here & add to cart':`Stay on the ${store==='US'?'US':'Australia'} store`;
    try { dialog.showModal(); return true; } catch (_) { return false; }
  }
  // Match the existing menu: a user-activated ordinary HTTPS link, with its exact URL.
  function menuDestination() {
    const fallback=rules.destination(homes[target.store],target.country);
    if (!fallback) return '';
    const expected=new URL(fallback);
    const menuLink=Array.from(document.querySelectorAll('details[data-store-dropdown] a[href]')).find(link=>{
      try {
        const url=new URL(link.href);
        return url.origin===expected.origin &&
          (target.country!=='NZ' || url.searchParams.get('country')==='NZ');
      } catch (_) { return false; }
    });
    return menuLink ? menuLink.href : fallback;
  }
  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-srp-action]')?.dataset.srpAction;
    if (!action) return;
    if (action==='switch') {
      const link=event.target.closest('a[href]');
      if (!link || !target || !menuDestination()) { event.preventDefault();close('dismiss');return; }
      remember();
      if (pending) { pending(false);pending=null; }
      // Do not preventDefault or assign location: keep the browser's native link navigation.
    } else close(action);
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close('dismiss');});
  // Existing country menus are read only: no listeners, URL rewriting or preference writes.
  window.SofneuRegionPrompt={
    beforeAdd: function (form) {
      const ask=rules.beforeAdd({enabled:true,secondEnabled:root.dataset.second==='true',mismatch:!!target,
        storageAvailable:true,explicitChoice:explicit(),firstDismissed:state.firstDismissed,
        secondSeen:state.secondSeen,pending:!!pending,validForm:!!form?.checkValidity?.()});
      if (pending) return Promise.resolve(false);
      if (!ask) return Promise.resolve(true);
      state.secondSeen=true; save();
      return new Promise(resolve=>{
        pending=resolve;
        if (!open('pre_add')) { pending=null;resolve(true); }
      });
    }
  };
  if (explicit() || !['AU','US'].includes(store)) { root.dataset.srpStatus='saved-choice'; return; }
  ['pointerdown','keydown','submit'].forEach(name=>document.addEventListener(name,()=>{userBusy=true;},{once:true,capture:true}));
  async function detect() {
    const testCountry = root.dataset.themeRole === 'development' ? new URL(location.href).searchParams.get('srp_test') : null;
    if (['AU','NZ','US','OTHER'].includes(testCountry)) write(session,keys.cache,{country:testCountry,until:now()+30*60000});
    let cached=read(session,keys.cache);
    if (cached?.until>now()) country=cached.country;
    else {
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
      try {
        const result=await fetch('https://api.country.is/',{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if (!result.ok) throw new Error('lookup failed');
        const data=await result.json(); country=['AU','NZ','US'].includes(data.country)?data.country:null;
        write(session,keys.cache,{country,until:now()+30*60000});
      } catch (_) { write(session,keys.cache,{country:null,until:now()+5*60000});return; }
      finally {clearTimeout(timer);}
    }
    target=rules.recommendation(country,store);
    if (root.dataset.themeRole==='development') root.dataset.srpStatus='detected-'+country+'-'+(target?'mismatch':'matched');
    if (!target || !rules.destination(homes[target.store],target.country) || state.firstDismissed) return;
    // Avoid overlaying an existing drawer, purchase interaction or another native modal.
    let attempts=0;
    const show=()=>{
      if (userBusy || explicit()) { root.dataset.srpStatus='interaction-or-choice'; return; }
      const other=Array.from(document.querySelectorAll('dialog[open], [aria-modal="true"]:not(.srp-dialog)')).some(node=>{
        if (node.closest('[hidden], [aria-hidden="true"]')) return false;
        const style=getComputedStyle(node);
        if (style.display==='none' || style.visibility==='hidden' || Number(style.opacity)===0) return false;
        return rules.intersectsViewport(node.getBoundingClientRect(),document.documentElement.clientWidth,document.documentElement.clientHeight);
      });
      if (other) { root.dataset.srpStatus='waiting-other-modal'; if (++attempts<10) setTimeout(show,1000);return; }
      root.dataset.srpStatus='opening';
      open('entry');
    };
    setTimeout(show,1000);
  }
  detect().catch(error=>{if(root.dataset.themeRole==='development')root.dataset.srpStatus='error-'+error.message;});
})();
