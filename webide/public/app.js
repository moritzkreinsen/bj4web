"use strict";
const strings = {
  en: {windows:"Windows",wrapLines:"Wrap long lines",openClass:"Open class…",minimize:"Minimize",getField:"Get",staticVars:"Show static fields",instanceVars:"Show instance fields",undo:"Undo",cut:"Cut",copy:"Copy",paste:"Paste",find:"Find...",closeEditor:"Close",source:"Source Code",documentation:"Documentation",nextMatch:"Find next",noMatch:"No match",modified:"Modified",manualPaste:"Press Ctrl+V or ⌘V to paste.",testClass:"Create Test Class",unsupportedWeb:"Unavailable in the web version",createObject:"Create Object",methodCall:"Method Call",instanceName:"Instance name:",remove:"Remove",duplicate:"Duplicate...",classInspect:"Inspect",inherited:"inherited from",methodResult:"Method Result",cancel:"Cancel",ok:"OK",rerun:"Run again",project:"Project",edit:"Edit",view:"View",editor:"Open editor",openZip:"Import workspace",inherit:"Create inheritance",uses:"Show arrows",pickChild:"Select the subclass.",pickParent:"Select its superclass.",unsupported:"Edit this inheritance declaration in the source editor.",rename:"Rename file",removeFile:"Delete file",importZip:"Import project",changePassword:"Set/change password",erase:"Delete workspace",confirm:"Confirm deletion?",replace:"Replace all sources?",close:"Close window",workspace:"Java workspace",security:"Use trusted Java code on this computer. Anyone with your link can edit the project unless you set a password. Lost links and passwords cannot be recovered.",password:"Workspace password (optional)",create:"Create workspace",link:"Workspace link",open:"Open workspace",add:"New class",save:"Save",compile:"Compile",export:"Export project",share:"Save link",classes:"Classes",bench:"Object bench",inspect:"Inspector",args:"Arguments, one per line. Use @name for an object.",resultName:"Name for the returned object (optional)",invoke:"Invoke",console:"Console",credit:"is an independent adaptation of",license:"GPL v2 with Classpath Exception",closeProject:"Close project",unlock:"Workspace password",filename:"Java source path",compiled:"Compilation succeeded",saved:"Saved",copied:"Workspace link copied",invalid:"Invalid input",empty:"Create a class first",denied:"Check your link and password",capacity:"Local capacity reached",compileFirst:"Compile the project first",stopped:"Runtime stopped",conflict:"Another session saved changes. Copy your edits before reloading.",failed:"Request failed",members:"Constructor or method"},
  de: {windows:"Fenster",wrapLines:"Lange Zeilen umbrechen",openClass:"Klasse öffnen…",minimize:"Minimieren",getField:"Hole",staticVars:"Zeige statische Variablen",instanceVars:"Zeige Instanzvariablen",undo:"Rückgängig",cut:"Ausschneiden",copy:"Kopieren",paste:"Einfügen",find:"Suchen...",closeEditor:"Schließen",source:"Quelltext",documentation:"Dokumentation",nextMatch:"Weitersuchen",noMatch:"Kein Treffer",modified:"Geändert",manualPaste:"Zum Einfügen Strg+V oder ⌘V drücken.",testClass:"Testklasse erzeugen",unsupportedWeb:"In der Webversion nicht verfügbar",createObject:"Objekt erzeugen",methodCall:"Methodenaufruf",instanceName:"Instanzname:",remove:"Entfernen",duplicate:"Duplicate...",classInspect:"Inspizieren",inherited:"geerbt von",methodResult:"Methodenergebnis",cancel:"Abbrechen",ok:"OK",rerun:"Re-run",project:"Projekt",edit:"Bearbeiten",view:"Ansicht",editor:"Editor öffnen",openZip:"Arbeitsbereich importieren",inherit:"Vererbung erstellen",uses:"Pfeile anzeigen",pickChild:"Wähle die Unterklasse.",pickParent:"Wähle ihre Oberklasse.",unsupported:"Bearbeite diese Vererbungsbeziehung im Quelltexteditor.",rename:"Datei umbenennen",removeFile:"Datei löschen",importZip:"Projekt importieren",changePassword:"Passwort setzen/ändern",erase:"Arbeitsbereich löschen",confirm:"Löschen bestätigen?",replace:"Alle Quelldateien ersetzen?",close:"Fenster schließen",workspace:"Java-Arbeitsbereich",security:"Führe hier nur vertrauenswürdigen Java-Code aus. Wer den Link kennt, kann das Projekt bearbeiten, sofern du kein Passwort setzt. Verlorene Links und Passwörter lassen sich nicht wiederherstellen.",password:"Passwort für den Arbeitsbereich (optional)",create:"Arbeitsbereich erstellen",link:"Link zum Arbeitsbereich",open:"Arbeitsbereich öffnen",add:"Neue Klasse...",save:"Speichern",compile:"Übersetzen",export:"Projekt exportieren",share:"Link speichern",classes:"Klassen",bench:"Objektleiste",inspect:"Inspektor",args:"Argumente, eines pro Zeile. Mit @name ein Objekt übergeben.",resultName:"Name für das zurückgegebene Objekt (optional)",invoke:"Aufrufen",console:"Konsole",credit:"ist eine unabhängige Adaption von",license:"GPL v2 mit Classpath Exception",closeProject:"Projekt schließen",unlock:"Arbeitsbereichspasswort",filename:"Pfad zur Java-Quelldatei",compiled:"Kompilierung erfolgreich",saved:"Gespeichert",copied:"Link zum Arbeitsbereich kopiert",invalid:"Ungültige Eingabe",empty:"Erstelle zuerst eine Klasse",denied:"Überprüfe Link und Passwort",capacity:"Lokale Kapazitätsgrenze erreicht",compileFirst:"Kompiliere zuerst das Projekt",stopped:"Laufzeit beendet",conflict:"Eine andere Sitzung hat Änderungen gespeichert. Kopiere deine Änderungen vor dem Neuladen.",failed:"Anfrage fehlgeschlagen",members:"Konstruktor oder Methode"}
};
const el = id => document.getElementById(id);
let language = localStorage.getItem("bj4web.language") || navigator.languages.map(s=>s.split("-")[0]).find(s=>s in strings) || "en";
const t = key => strings[language][key] || key;
function translate() {
  el("lang").value = document.documentElement.lang = language;
  document.querySelectorAll("[data-t]").forEach(node => node.textContent=t(node.dataset.t));
  document.querySelectorAll("[data-t-title]").forEach(n=>{n.title=t(n.dataset.tTitle); n.setAttribute("aria-label",n.title)});
  document.querySelectorAll("[data-t-label]").forEach(n=>n.setAttribute("aria-label",t(n.dataset.tLabel)));

}
el("lang").onchange = () => {language=el("lang").value; localStorage.setItem("bj4web.language",language); translate()};
translate();
let password="", token="", files={}, revision=0, selected="", receiver="", running=false, dirty=false, timer;
let queue=Promise.resolve(), lastCall=null;
function enqueue(fn) {
  queue=queue.then(fn).catch(e=>{el("status").textContent=e.message});
}
function click(id, fn) {el(id).onclick=()=>enqueue(fn)}
async function api(action, body={}) {
  const response=await fetch("/api/v1/"+action,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({...body,password})});
  const result=await response.json();
  if(!response.ok) throw Object.assign(Error(t(result.error||"failed")),{code:result.error});
  return result;
}
async function rpc(...parts) {
  const result=await api("runtime",{parts});
  if(result.console) el("console").textContent+=result.console;
  if(!result.ok) throw Error(result.value);
  return result.value;
}
function choices(id, names, fn) {
  el(id).replaceChildren();
  for(const name of names) {
    const b=document.createElement("button"); b.textContent=name; b.onclick=()=>enqueue(()=>fn(name)); el(id).append(b);
  }
}
async function chooseFile(name) {
  selected=name; receiver="";
  document.querySelectorAll(".tile").forEach(tile=>tile.setAttribute("aria-pressed",tile.dataset.path===name));
}
async function inspect(name) {
  await openInspector("object",name,name);
}
async function bench() {
  const rows=running ? (await rpc("bench")).split("\n").filter(Boolean) : [];
  el("bench").replaceChildren();
  for(const row of rows) {
    const [name,type]=row.split("\t");
    const button=document.createElement("button"); button.textContent=name+":\n"+type; button.dataset.name=name;
    function select(){receiver=name; for(const b of el("bench").children)b.setAttribute("aria-pressed",b===button);el("status").textContent=name+" : "+type}
    button.onclick=select;
    button.ondblclick=()=>enqueue(()=>inspect(name));
    button.oncontextmenu=event=>{event.preventDefault(); select(); enqueue(()=>objectMenu(name,event.clientX,event.clientY))};
    el("bench").append(button);
  }
}
async function openWorkspace() {
  const state=await api("open");
  layoutKey="bj4web.diagram."+Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))),n=>n.toString(16).padStart(2,"0")).join("");
  positions=JSON.parse(localStorage.getItem(layoutKey)||"{}");
  if(layoutKey!==openedWorkspace){resetRuntimeWindows();resetEditor();openedWorkspace=layoutKey}
  files=state.files; pruneTabs(); revision=state.revision; running=state.running; dirty=false;
  if(!running)resetRuntimeWindows();
  history.replaceState(null,"","#"+token);
  el("start").hidden=true; el("ide").hidden=false; el("status").textContent="";
  listFiles(); await chooseFile(Object.keys(files)[0]||""); if(!editorPath)el("source").value=files[selected]||""; await bench(); if(running)await renderWindow("");
}
click("create", async()=>{token=(await api("create")).token; await openWorkspace()});
async function save() {
  if(!dirty) return;
  const snapshot=JSON.stringify(files);
  revision=(await api("save",{revision,files})).revision;
  dirty=JSON.stringify(files)!==snapshot;
  el("status").textContent=t("saved"); el("editorState").textContent=t(dirty?"modified":"saved");
}
el("homeLink").onclick=event=>{
  if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || el("ide").hidden)return;
  event.preventDefault();
  enqueue(closeProject);
};
async function closeProject(){
  while(dirty)await save();
  location.assign(el("homeLink").href);
}
click("closeProject",closeProject);
function requestEntry(title, label, initial="", type="text") {
  const dialog=el("entryDialog"), input=el("entryValue");
  el("entryTitle").textContent=t(title);
  el("entryLabel").textContent=t(label);
  el("entryAccept").textContent=t("ok");
  input.hidden=type==="confirm";
  input.type=input.hidden?"text":type;
  input.value=initial;
  dialog.returnValue="";
  dialog.showModal();
  if(input.hidden) el("entryCancel").focus();
  else {input.focus(); input.select()}
  return new Promise(resolve=>{
    dialog.addEventListener("close",()=>{
      const value=dialog.returnValue==="accept" ? input.value : null;
      input.value="";
      resolve(value);
    },{once:true});
  });
}
el("entryCancel").onclick=()=>el("entryDialog").close("cancel");
click("add",async()=>{
  let path=await requestEntry("add","filename","Person.java"); if(!path) return;
  if(!path.endsWith(".java")) path+=".java";
  if(!/^(?:[\w$]+\/)*[a-zA-Z_$][\w$]*\.java$/.test(path)||Object.hasOwn(files,path)) throw Error(t("invalid"));
  const parts=path.slice(0,-5).split("/"), name=parts.pop();
  files[path]=(parts.length?"package "+parts.join(".")+";\n\n":"")+"public class "+name+" {\n\n}\n";
  dirty=true; listFiles(); await save(); running=false; await bench(); await chooseFile(path); editor();
});
el("source").oninput=()=>{renderSource();el("editorState").textContent=t("modified");files[editorPath]=el("source").value; changed.add(editorPath); listFiles(); dirty=true; clearTimeout(timer); timer=setTimeout(()=>enqueue(save),500)};
async function compileProject(inEditor=false){
  await save(); lastCall=null; el("rerun").disabled=true; const result=await api("compile"); running=result.ok; resetRuntimeWindows();
  el("console").textContent=result.console||""; el("status").textContent=result.ok?t("compiled"):"";
  changed.clear(); listFiles(); await bench();
  if(inEditor){
    el("editorErrors").textContent=result.console||"";el("editorErrors").hidden=result.ok;
    el("editorState").textContent=result.ok?t("compiled"):"";
  } else if(!result.ok) showPanel("consolePanel");
}
click("compile",()=>compileProject());
click("editorCompile",()=>compileProject(true));
let activeCall=null;
function suggestName(type) {
  const base=type[0].toLowerCase()+type.slice(1);
  const names=new Set(Array.from(el("bench").children,b=>b.dataset.name));
  let i=1; while(names.has(base+i)) i++;
  return base+i;
}
async function executeCall(call,args,name) {
  const value=await rpc("invoke",call.key,call.target,name,...args);
  lastCall={call,args}; el("rerun").disabled=false;
  await bench(); await renderWindow(name||call.target); await refreshInspectors();
  if(call.result!=="new" && call.result!=="void"){
    el("console").textContent+=value+"\n";
    el("inspectTitle").textContent=t("methodResult"); el("fields").textContent=value; showPanel("inspectPanel");
  }
}
async function beginCall(call) {
  if(call.result==="void" && !call.target && /^main\(String\[\] /.test(call.label))
    return executeCall(call,["[]"],"");
  const ctor=call.result==="new";
  // Reference-valued calls can put their result on the bench.
  const canKeep=!["new","void","int","char","byte","short","long","float","double","boolean","String"].includes(call.result);
  if(!ctor && !canKeep && !call.params.length) return executeCall(call,[],"");
  activeCall=call;
  el("callTitle").textContent="BJ4Web:  "+t(ctor?"createObject":"methodCall");
  el("signature").textContent=call.label;
  el("instanceRow").hidden=!ctor&&!canKeep;
  el("name").value=ctor?suggestName(call.label.split("(")[0]):"";
  el("name").required=ctor;
  el("parameters").replaceChildren();
  for(const param of call.params){
    const label=document.createElement("label"),input=document.createElement("input");
    label.textContent=param;label.append(input);el("parameters").append(label);
  }
  el("callError").textContent="";el("callDialog").showModal();
  const focus=el("parameters").querySelector("input")||el("name");focus.focus();focus.select();
}
el("cancelCall").onclick=()=>el("callDialog").close();
el("callForm").onsubmit=event=>{
  event.preventDefault(); const call=activeCall;
  const args=Array.from(el("parameters").querySelectorAll("input"),i=>i.value);
  const name=el("instanceRow").hidden?"":el("name").value.trim();
  el("invoke").disabled=true;
  enqueue(async()=>{try{await executeCall(call,args,name);el("callDialog").close()}
    catch(error){el("callError").textContent=error.message}finally{el("invoke").disabled=false}});
};
click("rerun",async()=>{if(running && lastCall) await executeCall(lastCall.call,lastCall.args,lastCall.call.result==="new"?suggestName(lastCall.call.label.split("(")[0]):"")});
function downloadFile(blob,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
click("share",()=>{
  const content=location.href+"\n"+(password?t("unlock")+": "+password+"\n":"");
  downloadFile(new Blob([content],{type:"text/plain;charset=utf-8"}),"bj4web.txt");
});
click("export",async()=>{
  await save();
  const layout=Object.fromEntries(Array.from(tiles,([path,tile])=>[path,[tile.offsetLeft,tile.offsetTop]]));
  const bytes=Uint8Array.from(atob((await api("export",{layout})).archive),c=>c.charCodeAt(0));
  downloadFile(new Blob([bytes],{type:"application/zip"}),"bj4web.zip");
});


async function renderWindow(name) {
  const layout=await rpc("frames",name);
  let view=null;
  for(const row of layout.split("\n").filter(Boolean)){
    const [kind,id,encoded]=row.split("\t");
    if(kind==="window" || kind==="closed"){
      const key="frame-"+id, title=decodeCell(encoded);
      view=frameViews.get(key);
      if(!view){
        const panel=frameViews.size?document.createElement("section"):el("window");
        if(!panel.id){panel.id=key;panel.className="panel guiPanel";el("ide").append(panel)}
        panel.classList.add("guiPanel"); panel.replaceChildren(); const body=document.createElement("div");panel.append(body);
        view={panel,body,id,title};frameViews.set(key,view);
        registerWindow(panel,title,()=>enqueue(async()=>{await rpc("frameState",id,"false");await renderWindow("")}));
        view.body=body;
        const record=managed.get(panel.id);
        const frameView=view;
        record.restore=()=>enqueue(async()=>{
          if(frameView.closed){await rpc("frameState",id,"true");await renderWindow("")}
          showPanel(panel.id);
        });
        showPanel(panel.id);
      }
      view.closed=kind==="closed"; view.body.replaceChildren();
      if(view.closed)view.panel.hidden=true;
      continue;
    }
    if(!view || view.closed)continue;
    if(kind==="image"){
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/png"}));
      const canvas=document.createElement("canvas"); canvas.width=bitmap.width;canvas.height=bitmap.height;
      canvas.getContext("2d").drawImage(bitmap,0,0);bitmap.close();view.body.append(canvas);
      if(id)canvas.onclick=event=>{
        const bounds=canvas.getBoundingClientRect();
        const x=Math.floor((event.clientX-bounds.left)*canvas.width/bounds.width);
        const y=Math.floor((event.clientY-bounds.top)*canvas.height/bounds.height);
        enqueue(async()=>{await rpc("pointer",id,String(x),String(y));await renderWindow("")});
      };
    }else{
      const node=document.createElement(kind==="button"?"button":"p");node.textContent=decodeCell(encoded);
      if(kind==="button")node.onclick=()=>enqueue(async()=>{await rpc("click",id);await renderWindow("")});
      view.body.append(node);
    }
  }
  drawWindowList();
}

async function updateFiles(next) {
  dirty=true; await save(); await api("stop"); running=false; resetRuntimeWindows();pruneTabs();
  listFiles(); await bench(); await chooseFile(next);
}
click("rename",async()=>{
  if(!selected) return;
  const next=await requestEntry("rename","filename",selected);
  if(!next || next===selected) return;
  if(!/^(?:[A-Za-z_$][\w$]*\/)*[A-Za-z_$][\w$]*\.java$/.test(next)||Object.hasOwn(files,next)) throw Error(t("invalid"));
  files[next]=files[selected]; delete files[selected]; await updateFiles(next);
});
click("removeFile",async()=>{
  if(!selected || await requestEntry("remove","confirm","","confirm")===null) return;
  delete files[selected]; await updateFiles(Object.keys(files)[0]||"");
});
el("importWorkspace").onclick=()=>el("openZip").click();
el("importProject").onclick=()=>el("projectFolder").click();
el("openZip").onchange=()=>enqueue(async()=>{
  const input=el("openZip"), file=input.files[0]; input.value="";
  if(!file)return;
  if(file.size>1048576)throw Error(t("invalid"));
  const bytes=new Uint8Array(await file.arrayBuffer()); let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  token=(await api("create")).token;
  try {await api("import",{revision:0,archive:btoa(binary)})}
  catch(error){await api("delete");throw error}
  await openWorkspace();
});
el("projectFolder").onchange=()=>enqueue(async()=>{
  const input=el("projectFolder"), selected=Array.from(input.files); input.value="";
  if(!selected.length)return;
  const sources=selected.filter(file=>file.name.endsWith(".java"));
  if(!sources.length)throw Error(t("empty"));
  if(sources.reduce((size,file)=>size+file.size,0)>1048576)throw Error(t("invalid"));
  if(Object.keys(files).length && await requestEntry("importZip","replace","","confirm")===null)return;
  const imported={};
  for(const file of sources)imported[file.webkitRelativePath.split("/").slice(1).join("/")]=await file.text();
  await save();
  await api("save",{revision,files:imported});
  await api("stop"); resetEditor(); changed.clear(); await openWorkspace();
});
click("erase",async()=>{if(confirm(t("confirm"))) {await api("delete"); location.replace(location.pathname)}});
click("changePassword",async()=>{
  const value=await requestEntry("changePassword","password","","password"); if(value===null) return;
  await api("password",{newPassword:value}); password=value;
});

let positions={}, layoutKey="", inheritance=null;
const changed=new Set();
const shortName=path=>path.split("/").pop().slice(0,-5);
const tiles=new Map();
const managed=new Map(), frameViews=new Map(), inspectors=new Map(), tabs=new Map();
let editorPath="", openedWorkspace="", depth=10;
function decodeCell(value){return new TextDecoder().decode(Uint8Array.from(atob(value),c=>c.charCodeAt(0)))}
function drawWindowList(){
  const list=el("windowList");list.replaceChildren();
  for(const [id,w] of managed){
    const row=document.createElement("div"),open=document.createElement("button"),close=document.createElement("button");
    open.textContent=w.title;open.onclick=()=>w.restore();close.textContent="×";close.title=t("closeEditor");
    close.setAttribute("aria-label",t("closeEditor")+" "+w.title);close.onclick=w.close;
    row.append(open,close);list.append(row);
  }
  for(const [id,label] of [["editorPanel","editor"],["consolePanel","console"]]){
    if(managed.has(id))continue;
    const b=document.createElement("button");b.textContent=t(label);b.onclick=()=>id==="editorPanel"?editor():showPanel(id);list.append(b);
  }
}
function forgetPanel(panel){
  managed.delete(panel.id);panel.hidden=true;
  if(panel.dataset.dynamic)panel.remove();
  drawWindowList();
}
function registerWindow(panel,title,close){
  let bar=panel.querySelector(":scope > .windowBar");
  if(!bar){
    bar=document.createElement("div");bar.className="windowBar";
    const caption=document.createElement("strong"),min=document.createElement("button"),exit=document.createElement("button");
    min.textContent="−";min.title=t("minimize");exit.textContent="×";exit.title=t("closeEditor");
    min.onclick=()=>{panel.hidden=true};exit.onclick=()=>managed.get(panel.id)?.close();
    bar.append(caption,min,exit);panel.prepend(bar);
    bar.onpointerdown=e=>{
      if(e.target.closest("button")||e.button!==0)return;
      const rect=panel.getBoundingClientRect(),dx=e.clientX-rect.left,dy=e.clientY-rect.top;
      bar.setPointerCapture(e.pointerId);
      bar.onpointermove=ev=>{panel.style.transform="none";panel.style.right="auto";panel.style.bottom="auto";
        panel.style.left=Math.max(0,Math.min(innerWidth-80,ev.clientX-dx))+"px";
        panel.style.top=Math.max(66,Math.min(innerHeight-32,ev.clientY-dy))+"px"};
      bar.onlostpointercapture=()=>{bar.onpointermove=null};
    };
    panel.addEventListener("pointerdown",()=>{panel.style.zIndex=++depth});
  }
  bar.firstChild.textContent=title;
  managed.set(panel.id,{title,close,restore:()=>showPanel(panel.id)});drawWindowList();
}
function showPanel(id){
  const panel=el(id);
  if(!managed.has(id)){
    const title=id==="editorPanel"?t("editor"):id==="inspectPanel"?el("inspectTitle").textContent:t("console");
    registerWindow(panel,title,()=>forgetPanel(panel));
  }
  panel.hidden=false;panel.style.zIndex=++depth;
}
function projectFront(){for(const id of managed.keys())el(id).hidden=true;el("windowsMenu").querySelector("summary").focus()}

el("windowsMenu").ontoggle=drawWindowList;
function resetRuntimeWindows(){
  for(const v of frameViews.values()){forgetPanel(v.panel);if(v.panel.id!=="window")v.panel.remove();else v.panel.replaceChildren()}
  frameViews.clear();
  for(const v of inspectors.values())forgetPanel(v.panel);
  inspectors.clear();
  if(managed.has("inspectPanel"))forgetPanel(el("inspectPanel"));
}
function resetEditor(){tabs.clear();editorPath="";forgetPanel(el("editorPanel"))}
function pruneTabs(){
  for(const path of tabs.keys())if(!Object.hasOwn(files,path))tabs.delete(path);
  if(editorPath&&!tabs.has(editorPath)){editorPath="";if(tabs.size)editor(tabs.keys().next().value);else resetEditor()}
}
function editor(path=selected){
  if(!Object.hasOwn(files,path))return;
  const input=el("source");
  if(tabs.has(editorPath))tabs.set(editorPath,{start:input.selectionStart,end:input.selectionEnd,scroll:input.scrollTop,mode:el("editorMode").value});
  editorPath=path;
  if(!tabs.has(path))tabs.set(path,{start:0,end:0,scroll:0,mode:"source"});
  const state=tabs.get(path);
  el("file").textContent=path;input.disabled=false;if(input.value!==files[path])input.value=files[path];
  el("editorTitle").textContent=shortName(path)+" – BJ4Web";
  registerWindow(el("editorPanel"),el("editorTitle").textContent,resetEditor);
  const list=el("tabList");list.replaceChildren();
  for(const tab of Object.keys(files).sort()){
    const b=document.createElement("button");b.textContent=Object.keys(files).some(other=>other!==tab && shortName(other)===shortName(tab))?tab:shortName(tab);b.title=tab;b.setAttribute("aria-pressed",tab===path);
    b.onclick=()=>editor(tab);list.append(b);
  }
  showPanel("editorPanel");el("editorMode").value=state.mode;changeEditorMode();
  el("findBar").hidden=true;el("editorErrors").hidden=true;
  el("editorState").textContent=t(dirty?"modified":"saved");renderSource();input.focus();
  input.setSelectionRange(state.start,state.end);input.scrollTop=state.scroll;
  if(el("wrapLines").checked)loadWrappedSource();
}
document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>forgetPanel(el(b.dataset.hide)));
click("editClass",()=>editor());
click("terminal",()=>showPanel("consolePanel"));
document.querySelectorAll("nav details").forEach(menu=>{
  menu.addEventListener("toggle",()=>{if(menu.open) for(const other of document.querySelectorAll("nav details")) if(other!==menu) other.open=false});
  menu.addEventListener("click",event=>{if(event.target.closest("button")) menu.open=false});
});
document.addEventListener("pointerdown",event=>{
  if(!event.target.closest("#context")) el("context").hidden=true;
  if(!event.target.closest("nav")) document.querySelectorAll("nav details").forEach(d=>d.open=false);
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape" && !el("entryDialog").open && !el("callDialog").open){
    el("context").hidden=true; inheritance=null; el("inherit").setAttribute("aria-pressed","false");
    if(!event.target.closest("#context"))projectFront();
  }
});
function sourceTokens(path) {
  return files[path].replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,part=>" ".repeat(part.length));
}
function edges() {
  const lines=[];
  if(!el("uses").checked){el("edges").replaceChildren();return}
  for(const [path,tile] of tiles) {
    const code=sourceTokens(path);
    const declaration=code.match(/\b(?:class|interface|enum|record)\s+[\w$]+([^{}]*)\{/);
    for(const [target,destination] of tiles) {
      if(path===target) continue;
      const name=shortName(target);
      const words=value=>value.match(/[A-Za-z_$][\w$]*/g)||[];
      const header=declaration?.[1]||"";
      const inherits=words(header.match(/\b(?:extends|implements)\b[\s\S]*/)?.[0]||"").includes(name);
      if(!inherits && !words(code).includes(name)) continue;
      const a={x:tile.offsetLeft+tile.offsetWidth/2,y:tile.offsetTop+tile.offsetHeight/2};
      const b={x:destination.offsetLeft+destination.offsetWidth/2,y:destination.offsetTop+destination.offsetHeight/2};
      const dx=b.x-a.x, dy=b.y-a.y;
      if(!dx&&!dy) continue;
      function boundary(node) {return Math.min(node.offsetWidth/2/Math.abs(dx),node.offsetHeight/2/Math.abs(dy))}
      const start=boundary(tile),end=boundary(destination);
      const line=document.createElementNS("http://www.w3.org/2000/svg","path");
      line.setAttribute("d",`M${a.x+dx*start},${a.y+dy*start} L${b.x-dx*end},${b.y-dy*end}`);
      if(!inherits){
        const direction=b.y>=a.y?1:-1;
        const top=a.y+direction*tile.offsetHeight/2;
        const endX=b.x+(a.x<b.x?-1:1)*destination.offsetWidth/2;
        const middle=top+(b.y-top)*0.52;
        const elbow=endX+(a.x<b.x?-18:18);
        line.setAttribute("d",Math.abs(dx)>tile.offsetWidth ?
          `M${a.x},${top} V${b.y} H${endX}` :
          `M${a.x},${top} V${middle} H${elbow} V${b.y} H${endX}`);
        line.setAttribute("fill","none");
      }
      line.setAttribute("stroke","#333"); line.setAttribute("stroke-width","1.4");
      line.setAttribute("marker-end",inherits?"url(#triangle)":"url(#tip)");
      if(!inherits) line.setAttribute("stroke-dasharray","6 4");
      lines.push(line);
    }
  }
  el("edges").replaceChildren(...lines);
}
el("uses").onchange=edges;
function place(tile,x,y) {
  tile.style.left=x+"px"; tile.style.top=y+"px";
}
function sizeSheet() {
  let w=0,h=0;
  for(const tile of tiles.values()){w=Math.max(w,tile.offsetLeft+tile.offsetWidth+24);h=Math.max(h,tile.offsetTop+tile.offsetHeight+24)}
  el("sheet").style.width=w+"px"; el("sheet").style.height=h+"px";
}
async function tileAction(path) {
  if(inheritance===null) return chooseFile(path);
  if(inheritance===""){inheritance=path; el("status").textContent=t("pickParent"); return}
  const child=inheritance;
  inheritance=null; el("inherit").setAttribute("aria-pressed","false");
  const match=sourceTokens(child).match(/\bclass\s+([A-Za-z_$][\w$]*)\s*(?=\{)/);
  if(path===child || !match || match[1]!==shortName(child) || !/\bclass\s/.test(sourceTokens(path))) throw Error(t("unsupported"));
  const end=match.index+match[0].trimEnd().length;
  files[child]=files[child].slice(0,end)+" extends "+path.slice(0,-5).replaceAll("/",".")+files[child].slice(end);
  dirty=true; changed.add(child); await save(); listFiles(); await chooseFile(child);
}
click("inherit",()=>{inheritance=inheritance===null?"":null; el("inherit").setAttribute("aria-pressed",inheritance!==null); el("status").textContent=inheritance===null?"":t("pickChild")});
function menuItem(parent,text,action,builtin=false) {
  const button=document.createElement("button"); button.textContent=text;
  if(builtin) button.className="builtin";
  button.onclick=()=>{el("context").hidden=true;enqueue(action)};
  parent.append(button);return button;
}
function addCalls(menu,description,target) {
  const groups=new Map();
  for(const row of description.split("\n").filter(Boolean)){
    const [key,result,label,parent,parameters]=row.split("\t");
    let list=menu;
    if(parent){
      if(!groups.has(parent)){
        const group=document.createElement("details"),summary=document.createElement("summary");
        summary.textContent=t("inherited")+" "+parent;group.append(summary);menu.prepend(group);groups.set(parent,group);
      }
      list=groups.get(parent);
    }
    menuItem(list,result+" "+label,()=>beginCall({key,result,label,target,params:parameters?parameters.split(", "):[]}));
  }
}
function openMenu(menu,x,y) {
  menu.hidden=false;
  menu.style.left=Math.max(0,Math.min(x,innerWidth-menu.offsetWidth))+"px";
  menu.style.top=Math.max(0,Math.min(y,innerHeight-menu.offsetHeight))+"px";
  (menu.querySelector("summary")||menu.querySelector("button")).focus();
}
el("context").onkeydown=event=>{
  const menu=el("context"), current=document.activeElement;
  const items=Array.from(menu.querySelectorAll("button,summary")).filter(item=>item.offsetHeight);
  const step=event.key==="ArrowDown"?1:event.key==="ArrowUp"?-1:0;
  if(step){event.preventDefault();items[(items.indexOf(current)+step+items.length)%items.length]?.focus()}
  if(event.key==="ArrowRight" && current.tagName==="SUMMARY"){current.parentElement.open=true;current.parentElement.querySelector("button")?.focus()}
  if(event.key==="ArrowLeft" && current.closest("details")){const group=current.closest("details");group.open=false;group.querySelector("summary").focus()}
};
function divider(menu){if(menu.childElementCount)menu.append(document.createElement("hr"))}
async function classMenu(path,x,y) {
  await chooseFile(path);
  const menu=el("context"),type=path.slice(0,-5).replaceAll("/","."); menu.replaceChildren();
  if(running && !changed.has(path)) addCalls(menu,await rpc("class",type),"");
  divider(menu);
  menuItem(menu,t("edit"),editor,true);
  menuItem(menu,t("compile"),()=>el("compile").click(),true);
  if(running && !changed.has(path)) menuItem(menu,t("classInspect"),async()=>{
    await openInspector("class",type,type);
  },true);
  menuItem(menu,t("remove"),()=>el("removeFile").click(),true);
  menuItem(menu,t("duplicate"),async()=>{
    const target=await requestEntry("duplicate","filename",path.replace(".java","Copy.java"));
    if(!target || !/^(?:[A-Za-z_$][\w$]*\/)*[A-Za-z_$][\w$]*\.java$/.test(target)||Object.hasOwn(files,target))return;
    const newName=shortName(target);
    if(target.slice(0,target.lastIndexOf("/")+1)!==path.slice(0,path.lastIndexOf("/")+1))throw Error(t("invalid"));
    files[target]=files[path].replace(/[A-Za-z_$][\w$]*/g,word=>word===shortName(path)?newName:word);
    await updateFiles(target);
  },true);
  for(const label of ["Convert to Stride",t("testClass")]){
    if(label===t("testClass"))divider(menu);
    const unavailable=document.createElement("button"); unavailable.textContent=label;
    unavailable.disabled=true;unavailable.title=t("unsupportedWeb");menu.append(unavailable);
  }
  openMenu(menu,x,y);
}
async function objectMenu(name,x,y) {
  receiver=name;const menu=el("context");menu.replaceChildren();
  addCalls(menu,await rpc("methods",name),name);divider(menu);
  menuItem(menu,t("classInspect"),()=>inspect(name),true);
  menuItem(menu,t("remove"),async()=>{await rpc("remove",name);await bench()},true);
  openMenu(menu,x,y);
}
function listFiles() {
  const layer=el("classes"); layer.replaceChildren(); tiles.clear();
  const paths=Object.keys(files);
  // Place the common dependency above its clients until the user moves the targets.
  const common=paths.length>2 && paths.find(path=>paths.every(other=>other===path ||
    (sourceTokens(other).match(/[A-Za-z_$][\w$]*/g)||[]).includes(shortName(path))));
  const clients=paths.filter(path=>path!==common).sort();
  for(const [index,path] of paths.entries()) {
    const tile=document.createElement("button"), label=document.createElement("strong");
    tile.className="tile";tile.dataset.path=path;tile.title=path;tile.setAttribute("aria-pressed",path===selected);
    tile.classList.toggle("pending",!running||changed.has(path));
    const kind=sourceTokens(path).match(/\b(interface|abstract\s+class|enum|record)\s+/);
    if(kind){const badge=document.createElement("small");badge.textContent="«"+kind[1]+"»";tile.append(badge)}
    label.textContent=shortName(path);tile.append(label);layer.append(tile);tiles.set(path,tile);
    const [x,y]=positions[path]||(common ? (path===common?[30+(clients.length-1)*85,30]:[30+clients.indexOf(path)*170,160]) : [38+(index%3)*190,35+Math.floor(index/3)*125+(index%2)*65]);
    place(tile,x,y);
    let drag=null,moved=false;
    tile.onpointerdown=e=>{if(e.button!==0)return;moved=false;drag={x:e.clientX,y:e.clientY,left:tile.offsetLeft,top:tile.offsetTop};tile.setPointerCapture(e.pointerId)};
    tile.onpointermove=e=>{
      if(!drag)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!moved && Math.hypot(dx,dy)<4)return;
      moved=true;place(tile,Math.max(4,drag.left+dx),Math.max(4,drag.top+dy));sizeSheet();edges();
    };
    tile.onpointerup=()=>{if(moved){positions[path]=[tile.offsetLeft,tile.offsetTop];localStorage.setItem(layoutKey,JSON.stringify(positions))}drag=null};
    tile.onpointercancel=()=>{drag=null};
    tile.onclick=()=>{if(!moved) enqueue(()=>tileAction(path));moved=false};
    tile.ondblclick=()=>enqueue(async()=>{await chooseFile(path);editor()});
    tile.onkeydown=e=>{if(e.key==="Enter" && !e.shiftKey){e.preventDefault();enqueue(async()=>{await chooseFile(path);editor()})}};
    tile.oncontextmenu=e=>{e.preventDefault();enqueue(()=>classMenu(path,e.clientX||tile.getBoundingClientRect().left,e.clientY||tile.getBoundingClientRect().bottom))};
  }
  el("empty").hidden=tiles.size>0; sizeSheet();edges();
}
function openLinkedWorkspace(){
  if(!location.hash || !el("ide").hidden)return;
  token=location.hash.slice(1);
  enqueue(async()=>{
    password="";
    for(;;){
      try {await openWorkspace();return}
      catch(error){
        if(error.code!=="denied")throw error;
        const value=await requestEntry("open",password?"denied":"unlock","","password");
        if(value===null){password="";history.replaceState(null,"",location.pathname);return}
        password=value;
      }
    }
  });
}
window.addEventListener("hashchange",openLinkedWorkspace);
openLinkedWorkspace();

// The native textarea owns selection, input methods and undo. A synchronized,
// read-only layer supplies BlueJ's token colors and lexical scope backgrounds.
function renderSource(){
  const source=el("source"), fragment=document.createDocumentFragment();
  const scopes=[], lines=source.value.split("\n");
  let block="", statement="";
  const lex=/\/\*|\/\/.*|"""|"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|[A-Za-z_$][\w$]*|[{};]|\s+|./gy;
  for(const line of lines){
    const row=document.createElement("div");row.className="codeRow";
    let frames=scopes.slice(), pos=0, boundary=false;
    while(pos<line.length){
      let value,style="";
      if(block){
        const end=line.indexOf(block==="text"?'"""':"*/",pos);
        value=line.slice(pos,end<0?line.length:end+(block==="text"?3:2));
        style=block==="text"?"javaLiteral":block==="doc"?"javaDoc":"javaComment";
        if(end>=0)block="";
      }else{
        lex.lastIndex=pos;value=lex.exec(line)[0];
        if(value==="/*"){block=line[pos+2]==="*"?"doc":"comment";style=block==="doc"?"javaDoc":"javaComment"}
        else if(value==='"""'){block="text";style="javaLiteral"}
        else if(value.startsWith("//"))style="javaComment";
        else if(/^["']/.test(value))style="javaLiteral";
        else {
          if(/^(class|interface|enum|record|void|byte|char|int|short|long|float|double|boolean)$/.test(value))style="javaType";
          else if(/^(public|private|protected|static|final|abstract|new|return|this|super|extends|implements|import|package|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|synchronized|volatile|instanceof|true|false|null)$/.test(value))style="javaKeyword";
          if(value==="{"){
            const initializer=/\[\s*\]\s*$|=\s*$/.test(statement) || scopes.at(-1)===null;
            const scope=initializer?null:/\b(class|interface|enum|record)\b/.test(statement)?"Class":/\b(for|while|do)\b/.test(statement)?"Loop":/\b(if|else|switch|try|catch|finally)\b/.test(statement)?"Choice":statement.includes(")")?"Method":scopes.at(-1);
            scopes.push(scope);
            if(scope && scopes.length>frames.length)frames=scopes.slice();
            statement="";if(scope)boundary=true;
          }else if(value==="}"){if(scopes.pop())boundary=true;statement=""}
          else if(value===";")statement="";
          else statement=(statement+value).slice(-1000);
        }
      }
      if(style){const span=document.createElement("span");span.className=style;span.textContent=value;row.append(span)}
      else row.append(document.createTextNode(value));
      pos+=value.length;
    }
    statement+=" ";
    const colors={Class:"#e1f8e1",Method:"#fafab4",Loop:"#f8e9f8",Choice:"#e9e9f8"};
    const layers=frames.filter(Boolean);
    if(layers.length){
      row.classList.add("scope"+layers.at(-1));
      const indent=CodeMirror.countColumn(line,null,4);
      if(!boundary && line.trim())layers.push("white");
      const left=[],right=[];
      layers.forEach((layer,index)=>{
        const color=colors[layer] || layer;
        left.push(color+" "+Math.min(index*4,indent)+"ch");
        if(index+1<layers.length){
          left.push(color+" "+Math.min((index+1)*4,indent)+"ch");
          right.push(color+" "+index*6+"px "+(index+1)*6+"px");
        }
      });
      row.style.setProperty("--frame-fill","linear-gradient(to right,"+left.join(",")+","+left.at(-1)+")");
      if(right.length)row.style.setProperty("--frame-edge","linear-gradient(to left,"+right.join(",")+",transparent "+right.length*6+"px)");
    }
    fragment.append(row);
  }
  el("highlightRows").replaceChildren(fragment);
  layoutLineNumbers();
}
function layoutLineNumbers(){
  const source=el("source"), overlay=el("highlightRows"), gutter=el("lineNumbers");
  gutter.textContent=Array.from(overlay.children,(_,index)=>index+1).join("\n");
  syncSourceScroll();
}
let wrappedEditor=null, wrappedPath=null;
function loadWrappedSource(){
  const source=el("source");
  if(!wrappedEditor){
    wrappedEditor=CodeMirror(el("writing"),{
      mode:"text/x-java",lineWrapping:true,lineNumbers:true,tabSize:4,indentUnit:4,
      inputStyle:"contenteditable",screenReaderLabel:t("source"),
      extraKeys:{Tab:cm=>cm.execCommand("insertSoftTab")}
    });
    wrappedEditor.on("renderLine",(cm,line,node)=>{
      const original=el("highlightRows").children[cm.getLineNumber(line)];
      if(original){
        for(const property of ["--frame-fill","--frame-edge"])
          node.style.setProperty(property,original.style.getPropertyValue(property));
      }
      const indent=CodeMirror.countColumn(line.text,null,4);
      // Preserve a usable editing width even for excessively indented input.
      const offset=Math.min(indent*cm.defaultCharWidth(),Math.max(0,cm.getScrollerElement().clientWidth/2));
      node.style.textIndent=-offset+"px";
      node.style.paddingLeft=(4+offset)+"px";
    });
    wrappedEditor.on("change",(cm,change)=>{
      if(change.origin==="setValue")return;
      source.value=cm.getValue();source.oninput();
    });
    wrappedEditor.on("cursorActivity",cm=>{
      source.setSelectionRange(cm.indexFromPos(cm.getCursor("from")),cm.indexFromPos(cm.getCursor("to")));
    });
  }
  const start=source.selectionStart,end=source.selectionEnd;
  if(wrappedPath!==editorPath || wrappedEditor.getValue()!==source.value){
    wrappedEditor.setValue(source.value);wrappedEditor.clearHistory();wrappedPath=editorPath;
  }
  wrappedEditor.refresh();
  wrappedEditor.setSelection(wrappedEditor.posFromIndex(start),wrappedEditor.posFromIndex(end));
  if(!el("editorPanel").hidden)wrappedEditor.focus();
}
function applyLineWrap(){
  const enabled=el("wrapLines").checked;
  el("writing").classList.toggle("wrapLines",enabled);
  if(enabled && editorPath)loadWrappedSource();
  else if(!el("editorPanel").hidden)el("source").focus();
}
el("wrapLines").checked=localStorage.getItem("bj4web.wrapLines")==="true";
el("wrapLines").onchange=()=>{localStorage.setItem("bj4web.wrapLines",el("wrapLines").checked);applyLineWrap()};
applyLineWrap();
function syncSourceScroll(){
  const source=el("source");el("highlight").scrollTop=source.scrollTop;el("highlight").scrollLeft=source.scrollLeft;
  el("highlightRows").style.setProperty("--frame-right",(source.scrollLeft+source.clientWidth-4)+"px");
  el("lineNumbers").scrollTop=source.scrollTop;
}
el("source").onscroll=syncSourceScroll;
new ResizeObserver(syncSourceScroll).observe(el("source"));
function changeEditorMode(){
  const docs=el("editorMode").value==="docs";
  el("writing").hidden=docs;el("sourceDocs").hidden=!docs;
  for(const id of ["undo","cut","copy","paste","find"])el(id).disabled=docs;
  if(!docs)return;
  el("findBar").hidden=true;
  const article=el("sourceDocs");article.replaceChildren();
  const heading=document.createElement("h2");heading.textContent=shortName(editorPath);article.append(heading);
  for(const match of el("source").value.matchAll(/(?:\/\*\*([\s\S]*?)\*\/\s*)?\b((?:public|protected)\s+[^{};]+)[{;]/g)){
    const signature=document.createElement("pre");signature.textContent=match[2].trim();article.append(signature);
    if(match[1]){const description=document.createElement("p");description.textContent=match[1].replace(/^\s*\* ?/gm,"").trim();article.append(description)}
  }
}
el("editorMode").onchange=changeEditorMode;
el("closeEditor").onclick=resetEditor;
const codeInput=el("source");
function activeEditorFocus(){if(el("wrapLines").checked)wrappedEditor.focus();else codeInput.focus()}
el("undo").onclick=()=>{if(el("wrapLines").checked){wrappedEditor.undo();return}codeInput.focus();document.execCommand("undo")};
for(const action of ["copy","cut"])el(action).onclick=()=>{
  activeEditorFocus();document.execCommand(action);
};
el("paste").onclick=async()=>{
  activeEditorFocus();
  try{const text=await navigator.clipboard.readText();if(el("wrapLines").checked){wrappedEditor.replaceSelection(text);return}document.execCommand("insertText",false,text)}
  catch{el("editorState").textContent=t("manualPaste")}
};
function openSearch(){el("findBar").hidden=false;el("searchTerm").focus();el("searchTerm").select()}
function findNext(){
  const term=el("searchTerm").value;if(!term)return;
  let at=codeInput.value.indexOf(term,codeInput.selectionEnd);
  if(at<0)at=codeInput.value.indexOf(term);
  if(at<0){el("editorState").textContent=t("noMatch");return}
  if(el("wrapLines").checked){wrappedEditor.focus();wrappedEditor.setSelection(wrappedEditor.posFromIndex(at),wrappedEditor.posFromIndex(at+term.length));return}
  codeInput.focus();codeInput.setSelectionRange(at,at+term.length);
  codeInput.scrollTop=Math.max(0,(codeInput.value.slice(0,at).split("\n").length-1)*20-codeInput.clientHeight/2);
}
el("find").onclick=openSearch;el("findNext").onclick=findNext;
el("searchTerm").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();findNext()}};
el("editorPanel").addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!el("findBar").hidden){e.stopPropagation();el("findBar").hidden=true;codeInput.focus()}
  if(!(e.metaKey||e.ctrlKey))return;
  if(e.key.toLowerCase()==="f"){e.preventDefault();openSearch()}
  if(e.key.toLowerCase()==="s"){e.preventDefault();enqueue(save)}
});


codeInput.addEventListener("keydown",event=>{
  if(event.isComposing||event.metaKey||event.ctrlKey||event.altKey)return;
  const before=codeInput.value.slice(0,codeInput.selectionStart).split("\n").pop();
  if(event.key==="Tab"&&!event.shiftKey){
    event.preventDefault();document.execCommand("insertText",false," ".repeat(4-before.length%4));
  }else if(event.key==="Enter"&&!event.shiftKey){
    event.preventDefault();
    const indent=before.match(/^\s*/)[0]+(before.trimEnd().endsWith("{")?"    ":"");
    document.execCommand("insertText",false,"\n"+indent);
  }
});

let nextInspector=0;
async function openInspector(kind,target,title){
  const key=kind+":"+target;
  if(inspectors.has(key)){
    const view=inspectors.get(key);await updateInspector(view);showPanel(view.panel.id);return;
  }
  const panel=document.createElement("section");panel.className="panel objectInspector";
  panel.id="inspector-"+(++nextInspector);panel.dataset.dynamic="true";el("ide").append(panel);
  const table=document.createElement("div"),actions=document.createElement("div");
  table.className="fieldTable";table.setAttribute("role","listbox");actions.className="inspectActions";
  const drill=document.createElement("button"),take=document.createElement("button"),toggle=document.createElement("button");
  drill.textContent=t("classInspect");take.textContent=t("getField");
  actions.append(drill,take);panel.append(table,actions,toggle);
  if(kind==="object"){target=await rpc("retain",target);kind="ref"}
  const v={panel,table,drill,take,toggle,kind,target,title,statics:kind==="class",selected:"",rows:[]};
  async function follow(get){
    const row=v.rows.find(row=>row[0]===v.selected);if(!row)return;
    const args=["table",kind,target,String(v.statics),row[0]];
    if(get){
      const name=await requestEntry("getField","instanceName",suggestName(row[1].split(" ").at(-1)));
      if(!name)return;await rpc(...args,name);await bench();
    }else{
      const ref=await rpc(...args);
      await openInspector("ref",ref,title+"."+row[1].split(" ").at(-1));
    }
  }
  drill.onclick=()=>enqueue(()=>follow(false));take.onclick=()=>enqueue(()=>follow(true));
  toggle.hidden=kind==="class";toggle.onclick=()=>enqueue(async()=>{v.statics=!v.statics;v.selected="";await updateInspector(v)});
  inspectors.set(key,v);
  try{await updateInspector(v)}catch(error){inspectors.delete(key);panel.remove();throw error}
  registerWindow(panel,title+" : "+v.type,()=>{
    inspectors.delete(key);forgetPanel(panel);if(kind==="ref")enqueue(()=>rpc("release",target));
  });
  showPanel(panel.id);
}
async function updateInspector(v){
  const raw=await rpc("table",v.kind,v.target,String(v.statics));
  const [type,...lines]=raw.split("\n");v.type=type;
  v.rows=lines.map(line=>line.split("\t"));v.table.replaceChildren();
  if(!v.rows.some(row=>row[0]===v.selected))v.selected=v.rows[0]?.[0]||"";
  function select(row){
    v.selected=row?.[0]||"";
    v.drill.disabled=row?.[3]!=="true";v.take.disabled=row?.[4]!=="true";
    for(const b of v.table.children)b.setAttribute("aria-selected",b.dataset.key===v.selected);
  }
  for(const row of v.rows){
    const b=document.createElement("button"),decl=document.createElement("span"),value=document.createElement("span");
    b.setAttribute("role","option");b.dataset.key=row[0];decl.textContent=row[1];value.textContent=decodeCell(row[2]);
    b.append(decl,value);v.table.append(b);b.onclick=()=>select(row);
    b.ondblclick=()=>{select(row);if(!v.drill.disabled)v.drill.click()};
  }
  select(v.rows.find(row=>row[0]===v.selected));v.toggle.textContent=t(v.statics?"instanceVars":"staticVars");
}
async function refreshInspectors(){for(const view of inspectors.values())await updateInspector(view)}
