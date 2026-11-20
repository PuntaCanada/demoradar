// A crawler-visible daily page has a bounded size. When >60 official records
// exist, reserve a fair opportunity for each documented city rather than
// silently filling the entire page from alphabetically first cities.
// This never creates, imports, or verifies a demonstration.
export function selectTodayEntries(events, limit=60){
 if(!Array.isArray(events)||!Number.isInteger(limit)||limit<1)throw Error("Invalid today entries or limit");
 const byCity=new Map();
 const byCityDate=(a,b)=>String(a.city).localeCompare(String(b.city),"de")||
  String(a.start||"").localeCompare(String(b.start||""))||
  String(a.title||"").localeCompare(String(b.title||""),"de")||
  String(a.id||"").localeCompare(String(b.id||""));
 for(const e of [...events].sort(byCityDate)){
  const key=String(e.city||"").normalize("NFKC").toLocaleLowerCase("de").replace(/\s+/g," ").trim();
  if(!key)continue;
  if(!byCity.has(key))byCity.set(key,[]);
  byCity.get(key).push(e);
 }
 // At most one event per city per round. No state is marked as fully covered.
 const buckets=[...byCity.values()],chosen=[];
 while(chosen.length<limit&&buckets.some(items=>items.length)){
  for(const group of buckets){
   if(chosen.length===limit)break;
   if(group.length)chosen.push(group.shift());
  }
 }
 return chosen.sort(byCityDate);
}
