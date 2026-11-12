// Run against a fresh loopback test server with Playwright and Chromium installed.
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
  const diagram=await browser.newPage(); await diagram.goto(url); await diagram.locator("#example").click();
  await diagram.waitForFunction(()=>document.querySelectorAll(".tile:not(.pending)").length===3);
  assert.equal(await diagram.locator("#edges path").count(),2);
  const student=diagram.getByRole("button",{name:"Student",exact:true});
  const before=await student.boundingBox();
  await diagram.mouse.move(before.x+25,before.y+20); await diagram.mouse.down();
  await diagram.mouse.move(before.x+100,before.y+80,{steps:6}); await diagram.mouse.up();
  assert.ok((await student.boundingBox()).x>before.x+50);
  await diagram.reload(); await student.waitFor(); assert.ok((await student.boundingBox()).x>before.x+50);
  await student.dblclick(); await diagram.locator("#source").waitFor();
  assert.match(await diagram.locator("#source").inputValue(),/extends Person/);
  await diagram.locator("[data-hide=editorPanel]").click();
  await student.click({button:"right"});
  await diagram.locator("#context button").filter({hasText:"Student()"}).first().click();
  await diagram.locator("#name").fill("student1"); await diagram.locator("#invoke").click();
  await diagram.locator("#bench button",{hasText:"student1"}).waitFor();
  await diagram.locator("[data-hide=inspectPanel]").click();
  if(process.env.BJ4WEB_SCREENSHOT) await diagram.screenshot({path:process.env.BJ4WEB_SCREENSHOT});
  assert.deepEqual(errors,[]);
  console.log("Browser workflow passed: password, sources, compilation, live objects, console, refresh, second browser, ZIP, language and Swing events.");
} finally {await browser.close()}
