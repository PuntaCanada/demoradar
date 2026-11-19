import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync("i18n.js","utf8");
const html=readFileSync("index.html","utf8");
const storage=new Map();
const elements=new Map();
const element=(key)=>{if(!elements.has(key))elements.set(key,{dataset:{},textContent:"",attributes:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v}});return elements.get(key)};
const de=element("de"),en=element("en");
de.dataset.language="de";en.dataset.language="en";
const tagged=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>{const x=element("tag:"+m[1]);x.dataset.i18n=m[1];return x});
const placeholders=[...html.matchAll(/data-i18n-placeholder="([^"]+)"/g)].map(m=>{const x=element("placeholder:"+m[1]);x.dataset.i18nPlaceholder=m[1];return x});
const labels=[...html.matchAll(/data-i18n-aria="([^"]+)"/g)].map(m=>{const x=element("aria:"+m[1]);x.dataset.i18nAria=m[1];return x});
const meta={content:""};
const doc={
 documentElement:{lang:""},title:"",
 querySelectorAll(sel){return ({"[data-language]":[de,en],"[data-i18n]":tagged,"[data-i18n-placeholder]":placeholders,"[data-i18n-aria]":labels})[sel]||[]},
 querySelector(sel){return sel==='meta[name="description"]'?meta:null},
 dispatchEvent() {}
};
const fakeWindow={};
const context={document:doc,window:fakeWindow,navigator:{language:"de-DE"},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}};
de.addEventListener=()=>{};en.addEventListener=()=>{};
runInNewContext(source,context);
const t=fakeWindow.DemoRadarI18n.t;
assert.equal(doc.documentElement.lang,"de");
assert.equal(t("today.title"),"Wichtig heute");
assert.equal(t("calendar.count",{count:5}),"5 gemeldete Veranstaltungen in diesem Monat");
for(const lang of ["en","de"]){
 fakeWindow.DemoRadarI18n.setLanguage(lang);
 assert.equal(doc.documentElement.lang,lang);
 assert.equal(storage.get("demoradar-language"),lang);
 for(const e of [...tagged,...placeholders,...labels]){
  const key=e.dataset.i18n||e.dataset.i18nPlaceholder||e.dataset.i18nAria;
  assert.notEqual(t(key),key,"Missing "+lang+" translation for "+key);
 }
}
fakeWindow.DemoRadarI18n.setLanguage("en");
assert.equal(t("today.title"),"Important today");
assert.equal(t("calendar.count",{count:5}),"5 reported events this month");
assert.equal(t("state.Bayern"),"Bavaria");
assert.equal(doc.title,"DemoRadar — Demonstrations and protests in Germany");
assert.ok(meta.content.includes("Germany"));
assert.ok(html.includes('data-language="de"')&&html.includes('data-language="en"'));
assert.ok(html.indexOf('src="/i18n.js"')<html.indexOf('src="/live.js"'));
console.log("DE/EN switch, interface keys, page metadata and persisted preference: OK");
