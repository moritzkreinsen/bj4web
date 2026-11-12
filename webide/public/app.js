"use strict";
const strings = {
  en: {testClass:"Create Test Class",unsupportedWeb:"Unavailable in the web version",createObject:"Create Object",methodCall:"Method Call",instanceName:"Instance name:",remove:"Remove",duplicate:"Duplicate...",classInspect:"Inspect",inherited:"inherited from",methodResult:"Method Result",cancel:"Cancel",ok:"OK",rerun:"Run again",project:"Project",edit:"Edit",view:"View",editor:"Open editor",openZip:"Open a project ZIP in a new workspace",inherit:"Create inheritance",uses:"Show uses arrows",pickChild:"Select the subclass.",pickParent:"Select its superclass.",unsupported:"Edit this inheritance declaration in the source editor.",rename:"Rename file",removeFile:"Delete file",importZip:"Replace sources from ZIP",changePassword:"Change password",erase:"Delete workspace",confirm:"Confirm deletion?",replace:"Replace all sources?",close:"Close window",workspace:"Java workspace",security:"Use trusted Java code on this computer. Anyone with your link can edit the project unless you set a password. Lost links and passwords cannot be recovered.",password:"Workspace password (optional)",create:"Create workspace",link:"Workspace link",open:"Open workspace",add:"New class",save:"Save",compile:"Compile",export:"Export ZIP",share:"Copy link",classes:"Classes",bench:"Object bench",inspect:"Inspector",args:"Arguments, one per line. Use @name for an object.",resultName:"Name for the returned object (optional)",invoke:"Invoke",console:"Console",credit:"BJ4Web is an independent adaptation of BlueJ · GPL v2 with Classpath Exception",filename:"Java source path",compiled:"Compilation succeeded",saved:"Saved",copied:"Workspace link copied",invalid:"Invalid input",empty:"Create a class first",denied:"Check your link and password",capacity:"Local capacity reached",compileFirst:"Compile the project first",stopped:"Runtime stopped",conflict:"Another session saved changes. Copy your edits before reloading.",failed:"Request failed",members:"Constructor or method"},
  de: {testClass:"Testklasse erzeugen",unsupportedWeb:"In der Webversion nicht verfügbar",createObject:"Objekt erzeugen",methodCall:"Methodenaufruf",instanceName:"Instanzname:",remove:"Entfernen",duplicate:"Duplicate...",classInspect:"Inspizieren",inherited:"geerbt von",methodResult:"Methodenergebnis",cancel:"Abbrechen",ok:"OK",rerun:"Re-run",project:"Projekt",edit:"Bearbeiten",view:"Ansicht",editor:"Editor öffnen",openZip:"Projekt-ZIP in einem neuen Arbeitsbereich öffnen",inherit:"Vererbung erstellen",uses:"Benutzt-Pfeile anzeigen",pickChild:"Wähle die Unterklasse.",pickParent:"Wähle ihre Oberklasse.",unsupported:"Bearbeite diese Vererbungsbeziehung im Quelltexteditor.",rename:"Datei umbenennen",removeFile:"Datei löschen",importZip:"Quelldateien aus ZIP ersetzen",changePassword:"Passwort ändern",erase:"Arbeitsbereich löschen",confirm:"Löschen bestätigen?",replace:"Alle Quelldateien ersetzen?",close:"Fenster schließen",workspace:"Java-Arbeitsbereich",security:"Führe hier nur vertrauenswürdigen Java-Code aus. Wer den Link kennt, kann das Projekt bearbeiten, sofern du kein Passwort setzt. Verlorene Links und Passwörter lassen sich nicht wiederherstellen.",password:"Passwort für den Arbeitsbereich (optional)",create:"Arbeitsbereich erstellen",link:"Link zum Arbeitsbereich",open:"Arbeitsbereich öffnen",add:"Neue Klasse...",save:"Speichern",compile:"Übersetzen",export:"ZIP exportieren",share:"Link kopieren",classes:"Klassen",bench:"Objektleiste",inspect:"Inspektor",args:"Argumente, eines pro Zeile. Mit @name ein Objekt übergeben.",resultName:"Name für das zurückgegebene Objekt (optional)",invoke:"Aufrufen",console:"Konsole",credit:"BJ4Web ist eine unabhängige Adaption von BlueJ · GPL v2 mit Classpath Exception",filename:"Pfad zur Java-Quelldatei",compiled:"Kompilierung erfolgreich",saved:"Gespeichert",copied:"Link zum Arbeitsbereich kopiert",invalid:"Ungültige Eingabe",empty:"Erstelle zuerst eine Klasse",denied:"Überprüfe Link und Passwort",capacity:"Lokale Kapazitätsgrenze erreicht",compileFirst:"Kompiliere zuerst das Projekt",stopped:"Laufzeit beendet",conflict:"Eine andere Sitzung hat Änderungen gespeichert. Kopiere deine Änderungen vor dem Neuladen.",failed:"Anfrage fehlgeschlagen",members:"Konstruktor oder Methode"}
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
let token="", files={}, revision=0, selected="", receiver="", running=false, dirty=false, timer;
let queue=Promise.resolve(), lastCall=null;
function enqueue(fn) {
  queue=queue.then(fn).catch(e=>{el("status").textContent=e.message});
}
function click(id, fn) {el(id).onclick=()=>enqueue(fn)}
async function api(action, body={}) {
  const response=await fetch("/api/v1/"+action,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({...body,password:el("password").value})});
  const result=await response.json();
  if(!response.ok) throw Error(t(result.error||"failed"));
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
  el("file").textContent=name; el("source").disabled=!name; el("source").value=files[name]||"";
  document.querySelectorAll(".tile").forEach(tile=>tile.setAttribute("aria-pressed",tile.dataset.path===name));
}
async function inspect(name) {
  receiver=name; el("inspectTitle").textContent=name;
  el("fields").textContent=await rpc("fields",name); showPanel("inspectPanel");
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
  files=state.files; revision=state.revision; running=state.running; dirty=false;
  history.replaceState(null,"","#"+token);
  el("start").hidden=true; el("ide").hidden=false; el("status").textContent="";
  listFiles(); await chooseFile(Object.keys(files)[0]||""); await bench();
}
click("create", async()=>{token=(await api("create")).token; await openWorkspace()});
click("open",async()=>{
  const url=new URL(el("link").value||location.href,location.href);
  if(url.origin!==location.origin || !/^#[\w-]{43}$/.test(url.hash)) throw Error(t("invalid"));
  token=url.hash.slice(1); await openWorkspace();
});
async function save() {
  if(!dirty) return;
  const snapshot=JSON.stringify(files);
  revision=(await api("save",{revision,files})).revision;
  dirty=JSON.stringify(files)!==snapshot;
  el("status").textContent=t("saved");
}
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
  dirty=true; listFiles(); await save(); running=false; await bench(); await chooseFile(path); showPanel("editorPanel"); el("source").focus();
});
el("source").oninput=()=>{files[selected]=el("source").value; changed.add(selected); listFiles(); dirty=true; clearTimeout(timer); timer=setTimeout(()=>enqueue(save),500)};
click("save",save);
click("compile",async()=>{
  await save(); lastCall=null; el("rerun").disabled=true; const result=await api("compile"); running=result.ok;
  el("console").textContent=result.console||""; el("status").textContent=result.ok?t("compiled"):"";
  changed.clear(); listFiles(); await bench(); await chooseFile(selected); el("editorPanel").hidden=true; if(!result.ok) showPanel("consolePanel");
});
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
  await bench(); await renderWindow(name||call.target);
  if(call.result!=="new" && call.result!=="void"){
    el("console").textContent+=value+"\n";
    el("inspectTitle").textContent=t("methodResult"); el("fields").textContent=value; showPanel("inspectPanel");
  }
}
async function beginCall(call) {
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
click("share",async()=>{await navigator.clipboard.writeText(location.href); el("status").textContent=t("copied")});
click("export",async()=>{
  await save(); const bytes=Uint8Array.from(atob((await api("export")).archive),c=>c.charCodeAt(0));
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([bytes],{type:"application/zip"})); a.download="bj4web.zip"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});


async function renderWindow(name) {
  const layout=await rpc("gui",name), panel=el("window");
  panel.hidden=!layout; panel.replaceChildren(); if(!layout) return;
  for(const row of layout.split("\n")) {
    const [kind,id,encoded]=row.split("\t");
    if(kind==="image") {
      const png=new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:"image/png"});
      const bitmap=await createImageBitmap(png), canvas=document.createElement("canvas");
      canvas.width=bitmap.width; canvas.height=bitmap.height;
      canvas.getContext("2d").drawImage(bitmap,0,0); bitmap.close(); panel.append(canvas); continue;
    }
    const node=document.createElement({window:"h2",label:"p",button:"button"}[kind]);
    node.textContent=new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
    if(kind==="button") node.onclick=()=>enqueue(async()=>{await rpc("click",id); await renderWindow(name)});
    panel.append(node);
  }
  const close=document.createElement("button"); close.textContent=t("close");
  close.onclick=()=>enqueue(async()=>{await rpc("close",name); await renderWindow(name)});
  panel.append(close);
}

async function updateFiles(next) {
  dirty=true; await save(); await api("stop"); running=false;
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
async function importArchive(input, fresh) {
  const file=input.files[0]; if(!file) return;
  if(file.size>1048576) throw Error(t("invalid"));
  if(!fresh && Object.keys(files).length && await requestEntry("importZip","replace","","confirm")===null) return;
  const bytes=new Uint8Array(await file.arrayBuffer()); let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  if(fresh){token=(await api("create")).token; revision=0}
  else await save();
  try {await api("import",{revision,archive:btoa(binary)})}
  catch(error){if(fresh) await api("delete"); throw error}
  await api("stop"); await openWorkspace();
}
for(const id of ["zip","openZip"]) el(id).onchange=()=>enqueue(async()=>{
  try {await importArchive(el(id),id==="openZip")} finally {el(id).value=""}
});
click("erase",async()=>{if(confirm(t("confirm"))) {await api("delete"); location.replace(location.pathname)}});
click("changePassword",async()=>{
  const value=await requestEntry("changePassword","password","","password"); if(value===null) return;
  await api("password",{newPassword:value}); el("password").value=value;
});

let positions={}, layoutKey="", inheritance=null;
const changed=new Set();
const shortName=path=>path.split("/").pop().slice(0,-5);
const tiles=new Map();
function showPanel(id) {
  for(const panel of document.querySelectorAll(".panel")) if(panel.id!=="window") panel.hidden=panel.id!==id;
  el(id).hidden=false;
}
document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>el(b.dataset.hide).hidden=true);
function editor() {
  if(selected) { showPanel("editorPanel"); el("source").focus() }
}
click("editClass",editor);
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
    for(const panel of document.querySelectorAll(".panel:not(#window)")) panel.hidden=true;
  }
});
function sourceTokens(path) {
  return files[path].replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,part=>" ".repeat(part.length));
}
function edges() {
  const lines=[];
  for(const [path,tile] of tiles) {
    const code=sourceTokens(path);
    const declaration=code.match(/\b(?:class|interface|enum|record)\s+[\w$]+([^{}]*)\{/);
    for(const [target,destination] of tiles) {
      if(path===target) continue;
      const name=shortName(target);
      const words=value=>value.match(/[A-Za-z_$][\w$]*/g)||[];
      const header=declaration?.[1]||"";
      const inherits=words(header.match(/\b(?:extends|implements)\b[\s\S]*/)?.[0]||"").includes(name);
      if(!inherits && (!el("uses").checked || !words(code).includes(name))) continue;
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
    el("inspectTitle").textContent=type;el("fields").textContent=await rpc("staticFields",type);showPanel("inspectPanel");
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
if(location.hash){el("link").value=location.href;token=location.hash.slice(1);enqueue(openWorkspace)}
