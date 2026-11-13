// Run against a fresh loopback test server with Playwright and Chromium installed.
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true});
try {
  const page=await browser.newPage({locale:"en-US"});
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  const url=process.env.BJ4WEB_URL || "http://127.0.0.1:8074";
  await page.goto(url);
  await page.locator("#password").fill("local-test-only");
  await page.locator("#create").click();
  await page.locator("#ide").waitFor();
  const project=page.url();
  await page.locator("#add").click();
  await page.locator("#entryValue").press("Escape");
  await page.locator("#entryDialog").waitFor({state:"hidden"});
  assert.equal(await page.locator(".tile").count(),0);
  async function add(path,source) {

    await page.locator("#add").click();
    await page.locator("#entryValue").fill(path);
    await page.locator("#entryValue").press("Enter");
    await page.waitForFunction(p=>document.querySelector("#file").textContent===p,path);
    if(path==="Person.java"){
      await page.locator("#source").fill("public class Person {");
      await page.locator("#source").press("End"); await page.locator("#source").press("Enter");
      assert.match(await page.locator("#source").inputValue(),/\n {4}$/);
      await page.locator("#editorCompile").click(); await page.locator("#editorErrors").waitFor();
      assert.match(await page.locator("#editorErrors").innerText(),/Person.java/);
    }
    await page.locator("#source").fill(source);
    if(path==="Person.java"){
      const wrap=page.locator("#editorPanel #wrapLines");
      assert.equal(await wrap.isChecked(),false);
      const line="        // "+"wrapped source ".repeat(36);
      await page.locator("#source").fill("public class Person {\n"+line+"\n}");
      await page.locator("#source").evaluate(node=>{node.scrollLeft=node.scrollWidth});
      await page.waitForFunction(()=>document.querySelector("#highlight").scrollLeft>0);
      const reachesRightEdge=await page.locator("#highlight").evaluate(node=>
        node.querySelector(".scopeClass").getBoundingClientRect().right>=node.getBoundingClientRect().right-3);
      assert.ok(reachesRightEdge,"Class shading should reach the right edge after horizontal scrolling");
      await page.locator("#source").fill(line);
      await wrap.check();
      const geometry=await page.locator(".CodeMirror").evaluate(node=>{
        const cm=node.CodeMirror, first=cm.charCoords({line:0,ch:8},"local");
        for(let ch=9;ch<cm.getLine(0).length;ch++){
          const pos=cm.charCoords({line:0,ch},"local");
          if(pos.top>first.top)return [first.left,pos.left];
        }
        return [];
      });
      assert.equal(geometry.length,2);
      assert.ok(Math.abs(geometry[0]-geometry[1])<2,JSON.stringify(geometry));
      await page.keyboard.press("End");await page.keyboard.type("test");
      assert.equal((await page.locator("#source").inputValue()).includes("test"),true);
      await wrap.uncheck();await page.locator("#source").fill(source);
    }
    await page.locator("#editorCompile").click();
    await page.waitForFunction(()=>document.querySelector("#editorState").textContent.match(/Compilation succeeded|Kompilierung erfolgreich/));
    await page.locator("#closeEditor").click();
  }
  async function invoke(pattern,args="",name="") {
    const target=pattern.startsWith("Person.")?page.locator("#bench button").first():page.locator(".tile[aria-pressed=true]");
    await target.click({button:"right"});
    const needle=pattern.startsWith("Person(")?"new Person(":pattern.split(".").pop().split("(")[0]+"(";
    await page.locator("#context button").filter({hasText:needle}).first().click();
    if(args || name){
      const inputs=page.locator("#parameters input");
      if(args) for(const [i,value] of args.split("\n").entries())await inputs.nth(i).fill(value);
      if(name)await page.locator("#name").fill(name);
      await page.locator("#invoke").click();await page.locator("#callDialog").waitFor({state:"hidden"});
    }
  }
  const source='public class Person { public Person friend = this; private int age; public Person(String name,int age){this.age=age;} public void birthday(){age++;System.out.println("birthday");} public int getAge(){return age;} public int read(Person p){return p.age;} }';
  await add("Person.java",source);
  await invoke("Person(java.lang.String,int)","Alice\n20","person1");
  await page.locator("#bench button",{hasText:"person1"}).click();
  await invoke("Person.birthday()");
  await page.locator("#bench button").first().dblclick();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll(".fieldTable button")).some(b=>b.firstChild.textContent.endsWith(" age")&&b.lastChild.textContent==="21"));
  const personInspector=page.locator(".objectInspector").first();
  await personInspector.getByRole("option",{name:/Person friend/}).dblclick();
  await page.waitForFunction(()=>document.querySelectorAll(".objectInspector").length===2);
  await page.locator(".objectInspector").last().locator(".windowBar button").last().click();
  await personInspector.getByRole("button",{name:"Get",exact:true}).click();
  await page.locator("#entryValue").fill("alias");await page.locator("#entryValue").press("Enter");
  await page.getByRole("button",{name:"alias: Person",exact:true}).waitFor();
  await invoke("Person.getAge()");
  await page.waitForFunction(()=>document.querySelector("#console").textContent.includes("21\n"));
  assert.match(await page.locator("#console").innerText(),/birthday/);
  await invoke("Person.read(Person)","@person1");
  await page.waitForFunction(()=>document.querySelector("#console").textContent.endsWith("21\n21\n"));
  await page.locator("#lang").selectOption("de");
  assert.equal(await page.locator("#compile").innerText(),"Übersetzen");
  const download=page.waitForEvent("download"); await page.locator("nav summary").first().click(); await page.locator("#export").click();
  assert.equal((await download).suggestedFilename(),"bj4web.zip");
  await page.reload(); await page.locator("#start").waitFor();
  await page.locator("#password").fill("local-test-only"); await page.locator("#open").click();
  await page.locator("#ide").waitFor(); assert.equal(await page.locator("#source").inputValue(),source);
  const second=await browser.newPage(); await second.goto(project);
  await second.waitForFunction(()=>document.querySelector("#status").textContent.length>0);
  assert.equal(await second.locator("#ide").isHidden(),true);
  await second.locator("#password").fill("local-test-only"); await second.locator("#open").click();
  await second.locator("#ide").waitFor(); assert.equal(await second.locator("#source").inputValue(),source);
  await add("CounterWindow.java",await readFile(new URL("../examples/CounterWindow.java",import.meta.url),"utf8"));
  await invoke("CounterWindow.create()","","counter");
  await page.locator("#bench button",{hasText:"counter"}).click({button:"right"});
  await page.locator("#context").waitFor();
  await page.keyboard.press("Escape");
  await page.locator("#window button",{hasText:"+1"}).click();
  await page.waitForFunction(()=>document.querySelector("#window p").textContent==="1");
  await page.locator("#window .windowBar button").last().click(); await page.locator("#window").waitFor({state:"hidden"});
  const diagram=await browser.newPage(); await diagram.goto(url); const projects=fileURLToPath(new URL("./projects/",import.meta.url));
  const archive=execFileSync("python3",["-c",`import io,sys,zipfile,pathlib
b=io.BytesIO()
with zipfile.ZipFile(b,"w") as z:
 for p in pathlib.Path("Shapes").glob("*"): z.write(p)
sys.stdout.buffer.write(b.getvalue())`],{cwd:projects});
  await diagram.locator("#openZip").setInputFiles({name:"Shapes.zip",mimeType:"application/zip",buffer:archive});
  const circle=diagram.getByRole("button",{name:"Circle",exact:true});
  await circle.click({button:"right"}); await diagram.locator("#context button").filter({hasText:/Compile|Übersetzen/}).click();
  await diagram.waitForFunction(()=>document.querySelectorAll(".tile:not(.pending)").length===4);
  assert.equal(await diagram.locator("#edges path").count(),3);
  const before=await circle.boundingBox();
  await diagram.mouse.move(before.x+25,before.y+20); await diagram.mouse.down();
  await diagram.mouse.move(before.x+100,before.y+80,{steps:6}); await diagram.mouse.up();
  await diagram.reload(); await circle.waitFor(); assert.ok((await circle.boundingBox()).x>before.x+50);
  await circle.dblclick(); await diagram.locator("#source").waitFor();
  assert.match(await diagram.locator("#source").inputValue(),/public class Circle/);
  assert.ok(await diagram.locator("#highlight .scopeMethod").count()>0);
  await diagram.locator("#find").click(); await diagram.locator("#searchTerm").fill("diameter");
  await diagram.locator("#findNext").click();
  assert.equal(await diagram.locator("#source").evaluate(n=>n.value.slice(n.selectionStart,n.selectionEnd)),"diameter");
  await diagram.locator("#editorMode").selectOption("docs");
  assert.match(await diagram.locator("#sourceDocs").innerText(),/changeSize/);
  await diagram.locator("#editorMode").selectOption("source");
  assert.equal(await diagram.locator("#tabList button").count(),4);
  await diagram.locator("#tabList button").filter({hasText:"Square"}).click();
  assert.match(await diagram.locator("#source").inputValue(),/class Square/);
  await diagram.keyboard.press("Escape");
  await circle.dblclick();await diagram.locator("#tabList button").filter({hasText:"Square"}).click();
  assert.match(await diagram.locator("#source").inputValue(),/class Square/);
  await diagram.keyboard.press("Escape");
  async function newCircle(expected,override) {
    await circle.click({button:"right"});
    await diagram.locator("#context button").filter({hasText:"new Circle()"}).click();
    assert.equal(await diagram.locator("#name").inputValue(),expected);
    assert.equal(await diagram.locator("#name").evaluate(n=>n.value.slice(n.selectionStart,n.selectionEnd)),expected);
    if(override) await diagram.locator("#name").fill(override);
    await diagram.locator("#name").press("Enter");
    await diagram.getByRole("button",{name:(override||expected)+": Circle",exact:true}).waitFor();
    await diagram.locator("#callDialog").waitFor({state:"hidden"});
  }
  await newCircle("circle1"); await newCircle("circle2","sonne"); await newCircle("circle2","mond");
  let object="sonne: Circle";
  async function method(name,arg=""){
    await diagram.getByRole("button",{name:object,exact:true}).click({button:"right"});
    await diagram.locator("#context button").filter({hasText:" "+name.split("(")[0]+"("}).first().click();
    if(arg){await diagram.locator("#parameters input").fill(arg);await diagram.locator("#invoke").click()}
  }
  await method("makeVisible()");
  await diagram.waitForFunction(()=>document.querySelector(".guiPanel:not([hidden]) canvas")?.getContext("2d").getImageData(60,70,1,1).data[2]===255 && document.querySelector(".guiPanel:not([hidden]) canvas").getContext("2d").getImageData(60,70,1,1).data[0]===0);
  await diagram.keyboard.press("Escape");
  await diagram.locator("#windowsMenu summary").click();
  await diagram.locator("#windowList button").filter({hasText:"Shapes"}).first().click();
  await diagram.locator("#window canvas").waitFor();
  await diagram.locator("#window .windowBar button").last().click();
  await diagram.locator("#window").waitFor({state:"hidden"});
  await diagram.locator("#windowsMenu summary").click();
  await diagram.locator("#windowList button").filter({hasText:"Shapes"}).first().click();
  await diagram.locator("#window canvas").waitFor();
  await method("moveHorizontal(int)","70");
  await diagram.waitForFunction(()=>document.querySelector(".guiPanel:not([hidden]) canvas")?.getContext("2d").getImageData(130,70,1,1).data[0]===0);
  await method("changeColor(java.lang.String)","yellow");
  await diagram.waitForFunction(()=>document.querySelector(".guiPanel:not([hidden]) canvas")?.getContext("2d").getImageData(130,70,1,1).data[2]===0);
  await diagram.getByRole("button",{name:"mond: Circle",exact:true}).dblclick();
  await diagram.waitForFunction(()=>Array.from(document.querySelectorAll(".fieldTable button")).some(b=>b.firstChild.textContent.endsWith(" visible")&&b.lastChild.textContent==="false"));
  assert.match(await diagram.locator(".fieldTable").innerText(),/"blue"/);
  await diagram.locator(".objectInspector .windowBar button").last().click();
  await diagram.locator(".guiPanel:visible .windowBar button").last().click();
  for(const type of ["Square","Triangle"]){
    await diagram.locator(".tile").filter({hasText:type}).click({button:"right"});
    await diagram.locator("#context button").filter({hasText:"new "+type+"()"}).click();
    await diagram.locator("#invoke").click();
    object=type.toLowerCase()+"1: "+type;
    await method("makeVisible()");
    const x=type==="Square" ? 140 : 200;
    const channel=type==="Square" ? 1 : 0;
    await diagram.waitForFunction(([x,ch])=>document.querySelector(".guiPanel:not([hidden]) canvas")?.getContext("2d").getImageData(x,75,1,1).data[ch]===0,[x,channel]);
    await diagram.locator(".guiPanel:visible .windowBar button").last().click();
  }
  if(process.env.BJ4WEB_SCREENSHOT) await diagram.screenshot({path:process.env.BJ4WEB_SCREENSHOT});
  const workspaceUrl=diagram.url();
  await diagram.keyboard.press("Escape");await circle.dblclick();
  const editedSource=(await diagram.locator("#source").inputValue())+"\n// Saved before returning home";
  await diagram.locator("#source").fill(editedSource);
  await diagram.getByRole("link",{name:"BJ4Web",exact:true}).click();
  await diagram.locator("#start").waitFor();
  assert.equal(new URL(diagram.url()).hash,"");
  await diagram.goto(workspaceUrl);await circle.dblclick();
  assert.equal(await diagram.locator("#source").inputValue(),editedSource);
  assert.deepEqual(errors,[]);
  console.log("Browser workflow passed: password, sources, compilation, live objects, console, refresh, second browser, ZIP, language and Swing events.");
} finally {await browser.close()}
