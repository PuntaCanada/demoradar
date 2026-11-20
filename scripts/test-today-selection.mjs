import assert from "node:assert/strict";
import {selectTodayEntries} from "./today-selection.mjs";
const records=[
 ...Array.from({length:84},(_,i)=>({id:"berlin-"+i,city:"Berlin",start:"08:00",title:"Berliner Eintrag "+i})),
 ...Array.from({length:3},(_,i)=>({id:"dresden-"+i,city:"Dresden",start:"09:00",title:"Dresdner Eintrag "+i})),
 ...Array.from({length:2},(_,i)=>({id:"rostock-"+i,city:"Rostock",start:"10:00",title:"Rostocker Eintrag "+i})),
 {id:"nrw-1",city:"Köln",start:"12:00",title:"Kölner Eintrag"}
];
const chosen=selectTodayEntries(records,60);
assert.equal(chosen.length,60);
assert.equal(new Set(chosen.map(e=>e.id)).size,60,"Never fabricate or duplicate IDs");
assert.deepEqual(new Set(chosen.map(e=>e.city)),new Set(["Berlin","Dresden","Rostock","Köln"]),"Do not bury cities when Berlin overflows");
assert.ok(chosen.every(e=>records.includes(e)),"Every chosen event must be in original source records");
assert.equal(chosen.filter(e=>e.city==="Köln").length,1);
assert.equal(chosen.filter(e=>e.city==="Dresden").length,3);
assert.equal(selectTodayEntries(records.slice(0,2),60).length,2);
assert.equal(selectTodayEntries(records,1).length,1);
assert.deepEqual(selectTodayEntries([...records].reverse(),60).map(e=>e.id),chosen.map(e=>e.id),"Selection order must not depend on importer insertion order");
for(const invalid of [0,-1,1.5,NaN])assert.throws(()=>selectTodayEntries(records,invalid));
console.log("Daily source-backed city balancing: deterministic, fair, bounded, no invented events");
