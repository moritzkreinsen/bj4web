"use strict";
const strings = {
  en: {rename:"Rename file",removeFile:"Delete file",importZip:"Replace sources from ZIP",changePassword:"Change password",erase:"Delete workspace",confirm:"Confirm deletion?",replace:"Replace all sources?",close:"Close window",workspace:"Java workspace",security:"Use trusted Java code on this computer. Anyone with your link can edit the project unless you set a password. Lost links and passwords cannot be recovered.",password:"Workspace password (optional)",create:"Create workspace",link:"Workspace link",open:"Open workspace",add:"New class",save:"Save",compile:"Compile",export:"Export ZIP",share:"Copy link",classes:"Classes",bench:"Object bench",inspect:"Inspector",args:"Arguments, one per line. Use @name for an object.",resultName:"Name for the returned object (optional)",invoke:"Invoke",console:"Console",credit:"BJ4Web is an independent adaptation of BlueJ · GPL v2 with Classpath Exception",filename:"Java source path",compiled:"Compilation succeeded",saved:"Saved",copied:"Workspace link copied",invalid:"Invalid input",empty:"Create a class first",denied:"Check your link and password",capacity:"Local capacity reached",compileFirst:"Compile the project first",stopped:"Runtime stopped",conflict:"Another session saved changes. Copy your edits before reloading.",failed:"Request failed",members:"Constructor or method"},
  de: {rename:"Datei umbenennen",removeFile:"Datei löschen",importZip:"Quelldateien aus ZIP ersetzen",changePassword:"Passwort ändern",erase:"Arbeitsbereich löschen",confirm:"Löschen bestätigen?",replace:"Alle Quelldateien ersetzen?",close:"Fenster schließen",workspace:"Java-Arbeitsbereich",security:"Führe hier nur vertrauenswürdigen Java-Code aus. Wer den Link kennt, kann das Projekt bearbeiten, sofern du kein Passwort setzt. Verlorene Links und Passwörter lassen sich nicht wiederherstellen.",password:"Passwort für den Arbeitsbereich (optional)",create:"Arbeitsbereich erstellen",link:"Link zum Arbeitsbereich",open:"Arbeitsbereich öffnen",add:"Neue Klasse",save:"Speichern",compile:"Kompilieren",export:"ZIP exportieren",share:"Link kopieren",classes:"Klassen",bench:"Objektleiste",inspect:"Inspektor",args:"Argumente, eines pro Zeile. Mit @name ein Objekt übergeben.",resultName:"Name für das zurückgegebene Objekt (optional)",invoke:"Aufrufen",console:"Konsole",credit:"BJ4Web ist eine unabhängige Adaption von BlueJ · GPL v2 mit Classpath Exception",filename:"Pfad zur Java-Quelldatei",compiled:"Kompilierung erfolgreich",saved:"Gespeichert",copied:"Link zum Arbeitsbereich kopiert",invalid:"Ungültige Eingabe",empty:"Erstelle zuerst eine Klasse",denied:"Überprüfe Link und Passwort",capacity:"Lokale Kapazitätsgrenze erreicht",compileFirst:"Kompiliere zuerst das Projekt",stopped:"Laufzeit beendet",conflict:"Eine andere Sitzung hat Änderungen gespeichert. Kopiere deine Änderungen vor dem Neuladen.",failed:"Anfrage fehlgeschlagen",members:"Konstruktor oder Methode"}
};
const el = id => document.getElementById(id);
let language = localStorage.getItem("bj4web.language") || navigator.languages.map(s=>s.split("-")[0]).find(s=>s in strings) || "en";
const t = key => strings[language][key] || key;
function translate() {
  el("lang").value = document.documentElement.lang = language;
  document.querySelectorAll("[data-t]").forEach(node => node.textContent=t(node.dataset.t));
  el("members").setAttribute("aria-label",t("members"));
}
el("lang").onchange = () => {language=el("lang").value; localStorage.setItem("bj4web.language",language); translate()};
translate();
let token="", files={}, revision=0, selected="", receiver="", running=false, dirty=false, timer;
let queue=Promise.resolve();
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
function members(value) {
  el("members").replaceChildren(...value.split("\n").filter(Boolean).map(s=>new Option(s,s)));
}
async function chooseFile(name) {
  el("window").hidden=true;
  selected=name; receiver="";
  el("file").textContent=name; el("source").disabled=!name; el("source").value=files[name]||"";
  el("fields").textContent=""; members("");
  if(running && name) {
    const type=name.slice(0,-5).replaceAll("/",".");
    members(await rpc("class",type));
    el("relations").textContent=await rpc("relations",type);
  } else el("relations").textContent="";
}
async function inspect(name) {
  receiver=name;
  await renderWindow(name);
  el("fields").textContent=await rpc("fields",name);
  members(await rpc("methods",name));
}
function listFiles() { choices("classes",Object.keys(files),chooseFile) }
async function bench() {
  choices("bench", running ? (await rpc("objects")).split("\n").filter(Boolean) : [], inspect);
}
async function openWorkspace() {
  const state=await api("open");
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
click("add",async()=>{
  let path=prompt(t("filename"),"Person.java"); if(!path) return;
  if(!path.endsWith(".java")) path+=".java";
  if(!/^(?:[\w$]+\/)*[a-zA-Z_$][\w$]*\.java$/.test(path)||Object.hasOwn(files,path)) throw Error(t("invalid"));
  const parts=path.slice(0,-5).split("/"), name=parts.pop();
  files[path]=(parts.length?"package "+parts.join(".")+";\n\n":"")+"public class "+name+" {\n\n}\n";
  dirty=true; listFiles(); await save(); running=false; await bench(); await chooseFile(path);
});
el("source").oninput=()=>{files[selected]=el("source").value; dirty=true; clearTimeout(timer); timer=setTimeout(()=>enqueue(save),500)};
click("save",save);
click("compile",async()=>{
  await save(); const result=await api("compile"); running=result.ok;
  el("console").textContent=result.console||""; el("status").textContent=result.ok?t("compiled"):"";
  await bench(); await chooseFile(selected);
});
click("invoke",async()=>{
  if(!el("members").value) throw Error(t("invalid"));
  const args=el("args").value;
  const result=await rpc("invoke",el("members").value,receiver,el("name").value.trim(),...(args?args.split("\n"):[]));
  el("console").textContent+=result+"\n"; el("name").value=""; el("args").value="";
  await bench(); if(receiver) {el("fields").textContent=await rpc("fields",receiver); await renderWindow(receiver)}
});
click("share",async()=>{await navigator.clipboard.writeText(location.href); el("status").textContent=t("copied")});
click("export",async()=>{
  await save(); const bytes=Uint8Array.from(atob((await api("export")).archive),c=>c.charCodeAt(0));
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([bytes],{type:"application/zip"})); a.download="bj4web.zip"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
if(location.hash) {el("link").value=location.href; token=location.hash.slice(1); enqueue(openWorkspace)}

async function renderWindow(name) {
  const layout=await rpc("gui",name), panel=el("window");
  panel.hidden=!layout; panel.replaceChildren(); if(!layout) return;
  for(const row of layout.split("\n")) {
    const [kind,id,encoded]=row.split("\t");
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
  const next=prompt(t("filename"),selected);
  if(!next || next===selected) return;
  if(!/^(?:[A-Za-z_$][\w$]*\/)*[A-Za-z_$][\w$]*\.java$/.test(next)||Object.hasOwn(files,next)) throw Error(t("invalid"));
  files[next]=files[selected]; delete files[selected]; await updateFiles(next);
});
click("removeFile",async()=>{
  if(!selected || !confirm(t("confirm"))) return;
  delete files[selected]; await updateFiles(Object.keys(files)[0]||"");
});
el("zip").onchange=()=>enqueue(async()=>{
  const file=el("zip").files[0]; if(!file || !confirm(t("replace"))) return;
  if(file.size>1048576) throw Error(t("invalid"));
  const bytes=new Uint8Array(await file.arrayBuffer()); let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  await save(); await api("import",{revision,archive:btoa(binary)}); await api("stop"); await openWorkspace(); el("zip").value="";
});
click("erase",async()=>{if(confirm(t("confirm"))) {await api("delete"); location.replace(location.pathname)}});
click("changePassword",async()=>{
  const value=prompt(t("changePassword")); if(value===null) return;
  await api("password",{newPassword:value}); el("password").value=value;
});
