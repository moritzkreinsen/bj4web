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
    await page.locator("#source").fill(source);
    await page.locator("#compile").click();
    await page.waitForFunction(()=>document.querySelector("#members").options.length>0);
  }
  async function invoke(pattern,args="",name="") {
    if(await page.locator("#inspectPanel").isHidden()){
      await page.locator(".tile[aria-pressed=true]").click({button:"right"});
      await page.locator("#context button").filter({hasText:pattern}).first().click();
    }
    const option=page.locator("#members option").filter({hasText:pattern}).first();
    await page.locator("#members").selectOption(await option.getAttribute("value"));
    await page.locator("#args").fill(args); await page.locator("#name").fill(name);
    await page.locator("#invoke").click();
  }
  const source='public class Person { private int age; public Person(String name,int age){this.age=age;} public void birthday(){age++;System.out.println("birthday");} public int getAge(){return age;} public int read(Person p){return p.age;} }';
  await add("Person.java",source);
  await invoke("Person(java.lang.String,int)","Alice\n20","person1");
  await page.locator("#bench button",{hasText:"person1"}).click();
  await invoke("Person.birthday()");
  await page.waitForFunction(()=>document.querySelector("#fields").textContent.includes("age = 21"));
  await invoke("Person.getAge()");
  await page.waitForFunction(()=>document.querySelector("#console").textContent.includes("21\n"));
  assert.match(await page.locator("#console").innerText(),/birthday/);
  await invoke("Person.read(Person)","@person1");
  await page.waitForFunction(()=>document.querySelector("#console").textContent.endsWith("21\n21\n"));
  await page.locator("#lang").selectOption("de");
  assert.equal(await page.locator("#compile").innerText(),"Kompilieren");
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
  await page.locator("#bench button",{hasText:"counter"}).click();
  await page.locator("#window button",{hasText:"+1"}).click();
  await page.waitForFunction(()=>document.querySelector("#window p").textContent==="1");
  await page.locator("#window button").last().click(); await page.locator("#window").waitFor({state:"hidden"});
  const diagram=await browser.newPage(); await diagram.goto(url); const projects=fileURLToPath(new URL("./projects/",import.meta.url));
  const archive=execFileSync("python3",["-c",`import io,sys,zipfile,pathlib
b=io.BytesIO()
with zipfile.ZipFile(b,"w") as z:
 for p in pathlib.Path("Shapes").glob("*"): z.write(p)
sys.stdout.buffer.write(b.getvalue())`],{cwd:projects});
  await diagram.locator("#openZip").setInputFiles({name:"Shapes.zip",mimeType:"application/zip",buffer:archive});
  const circle=diagram.getByRole("button",{name:"Circle",exact:true});
  await circle.click({button:"right"}); await diagram.locator("#context button").filter({hasText:/Compile|Kompilieren/}).click();
  await diagram.waitForFunction(()=>document.querySelectorAll(".tile:not(.pending)").length===4);
  assert.equal(await diagram.locator("#edges path").count(),3);
  const before=await circle.boundingBox();
  await diagram.mouse.move(before.x+25,before.y+20); await diagram.mouse.down();
  await diagram.mouse.move(before.x+100,before.y+80,{steps:6}); await diagram.mouse.up();
  await diagram.reload(); await circle.waitFor(); assert.ok((await circle.boundingBox()).x>before.x+50);
  await circle.dblclick(); await diagram.locator("#source").waitFor();
  assert.match(await diagram.locator("#source").inputValue(),/public class Circle/);
  await diagram.locator("[data-hide=editorPanel]").click();
  async function newCircle(expected,override) {
    await circle.click({button:"right"});
    await diagram.locator("#context button").filter({hasText:"new Circle()"}).click();
    assert.equal(await diagram.locator("#name").inputValue(),expected);
    if(override) await diagram.locator("#name").fill(override);
    await diagram.locator("#invoke").click();
    await diagram.getByRole("button",{name:(override||expected)+": Circle",exact:true}).waitFor();
    await diagram.locator("[data-hide=inspectPanel]").click();
  }
  await newCircle("circle1"); await newCircle("circle2","sonne"); await newCircle("circle2","mond");
  await diagram.getByRole("button",{name:"sonne: Circle",exact:true}).click({button:"right"});
  async function method(name,arg=""){
    const opt=diagram.locator("#members option").filter({hasText:name}).first();
    await diagram.locator("#members").selectOption(await opt.getAttribute("value"));
    await diagram.locator("#args").fill(arg); await diagram.locator("#invoke").click();
  }
  await method("makeVisible()");
  await diagram.waitForFunction(()=>document.querySelector("#window canvas")?.getContext("2d").getImageData(60,70,1,1).data[2]===255 && document.querySelector("#window canvas").getContext("2d").getImageData(60,70,1,1).data[0]===0);
  await method("moveHorizontal(int)","70");
  await diagram.waitForFunction(()=>document.querySelector("#window canvas")?.getContext("2d").getImageData(130,70,1,1).data[0]===0);
  await method("changeColor(java.lang.String)","yellow");
  await diagram.waitForFunction(()=>document.querySelector("#window canvas")?.getContext("2d").getImageData(130,70,1,1).data[2]===0);
  await diagram.getByRole("button",{name:"mond: Circle",exact:true}).click();
  await diagram.waitForFunction(()=>document.querySelector("#fields").textContent.includes("visible = false"));
  assert.match(await diagram.locator("#fields").innerText(),/color = blue/);
  await diagram.locator("[data-hide=inspectPanel]").click();
  await diagram.locator("#window button").last().click();
  for(const type of ["Square","Triangle"]){
    await diagram.locator(".tile").filter({hasText:type}).click({button:"right"});
    await diagram.locator("#context button").filter({hasText:"new "+type+"()"}).click();
    await diagram.locator("#invoke").click();
    await diagram.getByRole("button",{name:type.toLowerCase()+"1: "+type,exact:true}).click();
    await method("makeVisible()");
    const x=type==="Square" ? 140 : 200;
    const channel=type==="Square" ? 1 : 0;
    await diagram.waitForFunction(([x,ch])=>document.querySelector("#window canvas")?.getContext("2d").getImageData(x,75,1,1).data[ch]===0,[x,channel]);
    await diagram.locator("[data-hide=inspectPanel]").click();
    await diagram.locator("#window button").last().click();
  }
  if(process.env.BJ4WEB_SCREENSHOT) await diagram.screenshot({path:process.env.BJ4WEB_SCREENSHOT});
  assert.deepEqual(errors,[]);
  console.log("Browser workflow passed: password, sources, compilation, live objects, console, refresh, second browser, ZIP, language and Swing events.");
} finally {await browser.close()}
