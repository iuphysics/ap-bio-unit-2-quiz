const button=document.querySelector('#download-offline');
const label=document.querySelector('#offline-status');
const progress=document.querySelector('#offline-progress');
let registration;
function show(state){
 progress.hidden=!state.downloading;
 progress.max=state.total||1;progress.value=state.saved||0;
 button.disabled=!!state.downloading;
 if(state.error){label.textContent='Download incomplete. Reconnect and retry; saved files will be kept.';button.textContent='Resume download';}
 else if(state.ready){label.textContent='Ready offline — all 277 problems, explanations, and FRQ answers saved.';button.textContent='Check offline files';}
 else if(state.downloading){label.textContent=`Saving for offline use… ${state.saved||0} / ${state.total||'…'} files. Keep this page open.`;button.textContent='Downloading…';}
 else{label.textContent='Download all problems and diagrams once while online (about 40 MB).';button.textContent=state.saved>SHELL_COUNT?'Resume download':'Download for offline use';}
}
const SHELL_COUNT=10;
function ask(type){
 const worker=registration?.active;
 if(!worker)return;
 const channel=new MessageChannel();
 channel.port1.onmessage=e=>{show(e.data);channel.port1.close();};
 worker.postMessage({type},[channel.port2]);
}
button.addEventListener('click',()=>{
 if(button.textContent==='Check offline files'){ask('OFFLINE_STATUS');return;}
 show({downloading:true});ask('DOWNLOAD_OFFLINE');
});
async function initOffline(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext){label.textContent='Offline downloads need HTTPS and a browser that supports offline storage.';button.disabled=true;return;}
 try{
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='OFFLINE_STATUS')show(e.data);});
  registration=await navigator.serviceWorker.register('./sw.js');
  registration=await navigator.serviceWorker.ready;
  ask('OFFLINE_STATUS');
 }catch{label.textContent='Offline setup unavailable. Reconnect and reload this page to try again.';button.disabled=true;}
}
initOffline();
