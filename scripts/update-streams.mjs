#!/usr/bin/env node
// DemoRadar: optional YouTube/Twitch discovery. Uses official APIs, no scraping.
// Deliberately creates a review queue, NOT publicly approved event streams.
import {readFileSync,writeFileSync} from "node:fs";
const OUT="data/stream-discoveries.json";
const api={youtube:process.env.YOUTUBE_API_KEY||"",twitchId:process.env.TWITCH_CLIENT_ID||"",twitchSecret:process.env.TWITCH_CLIENT_SECRET||""};
const read=path=>{try{return JSON.parse(readFileSync(path,"utf8"))}catch{return {}}};
const channels=read("data/streamer-candidates.json").channels||[];
const events=[...(read("data/events.json").events||[]),...(read("data/demos-events.json").events||[])];
const now=new Date();
const now=new Date();
// YouTube search.list costs 100 quota units per request. Check YouTube every 2h
// (3 listed YouTube channels => ~3,600 search units/day, below default 10,000).
// Twitch remains on the 15-minute schedule when configured.
const youtubeWindow=now.getUTCHours()%2===0&&now.getUTCMinutes()<30;
const force=["workflow_dispatch","push"].includes(process.env.GITHUB_EVENT_NAME);

const day=24*3600000;
const dayISO=d=>new Date(d).toISOString().slice(0,10);
const recent=events.filter(e=>e&&e.id&&e.city&&e.date&&e.title&&e.date>=dayISO(now.getTime()-7*day)&&e.date<=dayISO(now.getTime()+7*day));
const unique=new Map(recent.map(e=>[e.id,e]));
const seen=new Set();
const candidates=[];
const errors=[];
const clean=s=>String(s||"").toLocaleLowerCase("de").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9äöüß]+/g," ").trim();
const stop=new Set("gegen fuer fur mit ohne die der das den dem eine einer einem aus von und zur zum fur pro demonstration kundgebung demo veranstaltung live livestream stream protest demonstrationen deutschland germany heute morgen bericht".split(" "));
const terms=s=>clean(s).split(/\s+/).filter(t=>t.length>=4&&!stop.has(t));
const core=s=>new Set(terms(s));
function matchEvent(title,date){
 const titleClean=clean(title),tokens=core(title);
 if(!tokens.size)return [];
 const matches=[];
 for(const e of unique.values()){
  if(!titleClean.includes(clean(e.city)))continue;
  if(date&&Math.abs(new Date(e.date+"T12:00:00Z")-new Date(date))>3*day)continue;
  const t=[...core(e.title)];
  const meaningful=t.filter(w=>tokens.has(w));
  if(meaningful.length<2)continue; // city alone or generic "Demo Berlin" is not enough
  if(!/(demo|kundgebung|protest|versammlung|demonstration|mahnwache|streik|aufzug)/i.test(title))continue;
  matches.push({event_id:e.id,city:e.city,date:e.date,matched_terms:meaningful.slice(0,6)});
 }
 return matches.slice(0,4);
}
async function json(url,opts={}){
 const response=await fetch(url,{...opts,headers:{"accept":"application/json",...(opts.headers||{})},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("HTTP "+response.status+" at "+new URL(url).hostname);
 return response.json();
}
function add(video){
 if(!video?.url||!video?.title||!video?.channel)return;
 const key=video.platform+"|"+video.url;
 if(seen.has(key))return;seen.add(key);
 const matches=matchEvent(video.title,video.date);
 if(!matches.length)return;
 for(const event of matches){
  candidates.push({...video,...event,reviewed:false,auto_match:true,
   note:"AUTOMATIC CANDIDATE ONLY: two distinct topic terms plus city, date and demonstration keyword. Verify before publishing."});
 }
}
async function youtube(){
 if(!api.youtube)return;
 const handles=[...new Set(channels.flatMap(c=>(c.platforms||[]).filter(p=>p.platform==="youtube").map(p=>({name:c.name,handle:new URL(p.url).pathname.split("/").filter(Boolean)[0]}))))];
 for(const entry of handles){
  if(!entry.handle?.startsWith("@"))continue;
  try{
   const ch=await json("https://www.googleapis.com/youtube/v3/channels?part=id&forHandle="+encodeURIComponent(entry.handle)+"&key="+encodeURIComponent(api.youtube));
   const id=ch.items?.[0]?.id;if(!id)continue;
   const query="https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=12&channelId="+encodeURIComponent(id)+"&key="+encodeURIComponent(api.youtube);
   const found=await json(query);
   const ids=(found.items||[]).map(v=>v.id?.videoId).filter(Boolean);
   if(!ids.length)continue;
   const details=await json("https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id="+encodeURIComponent(ids.join(","))+"&key="+encodeURIComponent(api.youtube));
   for(const v of details.items||[]){
    const s=v.snippet||{},d=v.liveStreamingDetails||{};
    const isLive=s.liveBroadcastContent==="live"&&!!d.actualStartTime&&!d.actualEndTime;
    const recording=!!d.actualEndTime;
    if(!isLive&&!recording)continue; // do not mistake an upcoming stream for live
    add({platform:"YouTube",channel:entry.name,title:s.title,url:"https://www.youtube.com/watch?v="+v.id,
     date:isLive?d.actualStartTime:d.actualStartTime||s.publishedAt,status:isLive?"live":"recording",
     checked_at:now.toISOString(),evidence_url:"https://www.youtube.com/watch?v="+v.id});
   }
  }catch(error){errors.push("YouTube "+entry.name+": "+error.message)}
 }
}
async function twitch(){
 if(!api.twitchId||!api.twitchSecret)return;
 const accounts=channels.flatMap(c=>(c.platforms||[]).filter(p=>p.platform==="twitch").map(p=>({name:c.name,login:new URL(p.url).pathname.split("/").filter(Boolean)[0]}))).filter(x=>x.login);
 if(!accounts.length)return;
 try{
  const token=await json("https://id.twitch.tv/oauth2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:api.twitchId,client_secret:api.twitchSecret,grant_type:"client_credentials"})});
  const headers={"Client-ID":api.twitchId,Authorization:"Bearer "+token.access_token};
  const users=await json("https://api.twitch.tv/helix/users?"+accounts.map(c=>"login="+encodeURIComponent(c.login)).join("&"),{headers});
  const byId=new Map((users.data||[]).map(u=>[u.id,u]));
  const logins=new Map(accounts.map(a=>[a.login.toLowerCase(),a.name]));
  if(!byId.size)return;
  const live=await json("https://api.twitch.tv/helix/streams?"+[...byId.keys()].map(id=>"user_id="+encodeURIComponent(id)).join("&"),{headers});
  for(const s of live.data||[]){
   const u=byId.get(s.user_id);if(!u)continue;
   add({platform:"Twitch",channel:logins.get(u.login.toLowerCase())||u.display_name,title:s.title,
    url:"https://www.twitch.tv/"+u.login,date:s.started_at,status:"live",checked_at:now.toISOString(),
    evidence_url:"https://www.twitch.tv/"+u.login});
  }
  for(const [id,u] of byId){
   try{
    const clips=await json("https://api.twitch.tv/helix/videos?user_id="+encodeURIComponent(id)+"&type=archive&first=8",{headers});
    for(const v of clips.data||[]){
     if(!v.url||!v.created_at||new Date(v.created_at)<new Date(now.getTime()-14*day))continue;
     add({platform:"Twitch",channel:logins.get(u.login.toLowerCase())||u.display_name,title:v.title,
      url:v.url,date:v.created_at,status:"recording",checked_at:now.toISOString(),evidence_url:v.url});
    }
   }catch(e){errors.push("Twitch archive "+u.login+": "+e.message)}
  }
 }catch(error){errors.push("Twitch: "+error.message)}
}
if(youtubeWindow||force)await youtube();
else console.log("YouTube quota guard: next 2-hour polling window.");
await twitch();
const enabled=Boolean(api.youtube||(api.twitchId&&api.twitchSecret));
if(!enabled){console.log("No YouTube/Twitch API credentials set; leaving previous discoveries unchanged.");process.exit(0)}
const previous=read(OUT);
const firstRun=!Object.hasOwn(previous,"version");
const prev=(previous.candidates||[]).filter(x=>x.reviewed!==true);
const combined=new Map();
for(const x of [...prev,...candidates]){
 const k=x.event_id+"|"+x.url;
 if(!x.event_id||!x.url)continue;
 // Keep a candidate for fourteen days, even if the platform's newest listing has moved on.
 if(x.checked_at&&new Date(x.checked_at)<new Date(now.getTime()-14*day))continue;
 combined.set(k,x);
}
const output={version:1,updated_at:now.toISOString(),mode:"suggestions_only",verified_public_live_count:0,
 notes:"Matches are candidates and are NOT published on event pages until independently reviewed. Platform-live ≠ event-confirmed.",
 sources:{youtube_configured:!!api.youtube,twitch_configured:!!(api.twitchId&&api.twitchSecret)},
 candidates:[...combined.values()].slice(0,100),errors:errors.slice(0,20)};
// Avoid 96 no-op commits per day. Only new/changed links, statuses and fresh LIVE checks
// need to be saved. A recording remains in the queue without touching its timestamps.
const stable=x=>JSON.stringify({
 version:x.version,mode:x.mode,sources:x.sources,
 candidates:(x.candidates||[]).map(item=>({
  ...item,checked_at:item.status==="live"?item.checked_at:undefined
 })).sort((a,b)=>(a.event_id+"|"+a.url).localeCompare(b.event_id+"|"+b.url))
});
if(!firstRun&&stable(previous)===stable(output)){
 console.log("No changed stream candidates or status.");process.exit(0);
}
writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");
console.log("Stream discovery candidates:",output.candidates.length,"new:",candidates.length,"errors:",errors.length);
