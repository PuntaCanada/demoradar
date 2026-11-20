#!/usr/bin/env node
// DemoRadar: optional YouTube/Twitch discovery. Uses official APIs, no scraping.
// Deliberately creates a review queue, NOT publicly approved event streams.
import {readFileSync,writeFileSync} from "node:fs";
import {matchEvents,platformAccount,candidateStillMatches} from "./stream-matcher.mjs";
const OUT="data/stream-discoveries.json";
const api={youtube:process.env.YOUTUBE_API_KEY||"",twitchId:process.env.TWITCH_CLIENT_ID||"",twitchSecret:process.env.TWITCH_CLIENT_SECRET||""};
const read=path=>{try{return JSON.parse(readFileSync(path,"utf8"))}catch{return {}}};
const channels=read("data/streamer-candidates.json").channels||[];
const events=[...(read("data/events.json").events||[]),...(read("data/demos-events.json").events||[])];
const now=new Date();
// Read-only YouTube endpoints cost one unit each per page. At most 20 channels,
// three API requests per channel, 96 runs/day = at most 5,760 units/day.
const force=["workflow_dispatch","push"].includes(process.env.GITHUB_EVENT_NAME);

const day=24*3600000;
const dayISO=d=>new Date(d).toISOString().slice(0,10);
const recent=events.filter(e=>e&&e.id&&e.city&&e.date&&e.title&&e.date>=dayISO(now.getTime()-30*day)&&e.date<=dayISO(now.getTime()+7*day));
const unique=new Map(recent.map(e=>[e.id,e]));
const seen=new Set();
const candidates=[];
const errors=[];
const samples=[];
const sampleCounts=new Map();
async function json(url,opts={}){
 const response=await fetch(url,{...opts,headers:{"accept":"application/json",...(opts.headers||{})},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("HTTP "+response.status+" at "+new URL(url).hostname);
 return response.json();
}
function add(video){
 if(!video?.url||!video?.title||!video?.channel)return;
 const key=video.platform+"|"+video.url;
 if(seen.has(key))return;seen.add(key);
 const matches=matchEvents(video,[...unique.values()]);
 // Diagnostic samples are real platform video metadata, never claimed as DemoRadar matches.
 // Only retain a small recent sample to tune false negatives safely.
 if(video.platform==="YouTube"&&video.date&&new Date(video.date)>=new Date(now.getTime()-30*day)&&
   (sampleCounts.get(video.channel)||0)<3){
  sampleCounts.set(video.channel,(sampleCounts.get(video.channel)||0)+1);
  samples.push({channel:video.channel,title:video.title.slice(0,180),url:video.url,
   date:video.date,status:video.status,match_count:matches.length});
 }
 if(!matches.length)return;
 for(const event of matches){
  candidates.push({...video,...event,reviewed:false,auto_match:true,
   note:"AUTOMATIC CANDIDATE ONLY: unique city, event-day proximity and two distinctive topic terms matched. Verify independently before publishing."});
 }
}
const discoveryStats={youtube_channels_checked:0,youtube_videos_checked:0,youtube_streams_seen:0,twitch_channels_checked:0};
async function youtube(){
 if(!api.youtube)return;
 const accounts=channels.flatMap(c=>(c.platforms||[]).filter(p=>p.platform==="youtube")
   .map(p=>({name:c.name,handle:platformAccount(p.url,"youtube")})));
 const uniqueHandles=[...new Map(accounts.filter(x=>x.handle?.startsWith("@")).map(x=>[x.handle.toLowerCase(),x])).values()].slice(0,20);
 for(const entry of uniqueHandles){
  try{
   // channels.list, playlistItems.list and videos.list each use the low-cost read quota;
   // unlike search.list, this retrieves up to 50 recent uploads from each verified channel.
   const ch=await json("https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle="+encodeURIComponent(entry.handle)+"&key="+encodeURIComponent(api.youtube));
   const channel=ch.items?.[0];
   if(!channel?.id){errors.push("YouTube handle not found: "+entry.handle);continue}
   discoveryStats.youtube_channels_checked++;
   const playlist=channel.contentDetails?.relatedPlaylists?.uploads;
   if(!playlist){errors.push("YouTube uploads playlist missing: "+entry.handle);continue}
   const found=await json("https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId="+encodeURIComponent(playlist)+"&key="+encodeURIComponent(api.youtube));
   const ids=[...new Set((found.items||[]).map(v=>v.contentDetails?.videoId).filter(Boolean))];
   if(!ids.length)continue;
   const details=await json("https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id="+encodeURIComponent(ids.join(","))+"&key="+encodeURIComponent(api.youtube));
   for(const v of details.items||[]){
    discoveryStats.youtube_videos_checked++;
    const s=v.snippet||{},d=v.liveStreamingDetails||{};
    const isLive=s.liveBroadcastContent==="live"&&!!d.actualStartTime&&!d.actualEndTime;
    const recording=!!d.actualEndTime;
    if(!isLive&&!recording)continue;
    discoveryStats.youtube_streams_seen++;
    add({platform:"YouTube",channel:entry.name,title:s.title,url:"https://www.youtube.com/watch?v="+v.id,
     date:d.actualStartTime||s.publishedAt,published_at:s.publishedAt,broadcast_started_at:d.actualStartTime||null,status:isLive?"live":"recording",
     checked_at:now.toISOString(),evidence_url:"https://www.youtube.com/watch?v="+v.id});
   }
  }catch(error){errors.push("YouTube "+entry.name+": "+error.message)}
 }
}
async function twitch(){
 if(!api.twitchId||!api.twitchSecret)return;
 const accounts=channels.flatMap(c=>(c.platforms||[]).filter(p=>p.platform==="twitch").map(p=>({name:c.name,login:platformAccount(p.url,"twitch")}))).filter(x=>x.login);
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
await youtube();
await twitch();
const enabled=Boolean(api.youtube||(api.twitchId&&api.twitchSecret));
if(!enabled){console.log("No YouTube/Twitch API credentials set; leaving previous discoveries unchanged.");process.exit(0)}
const previous=read(OUT);
const firstRun=!Object.hasOwn(previous,"version");
const prev=(previous.candidates||[]).filter(x=>x.reviewed!==true);
const currentEventIds=new Set(unique.keys());
const combined=new Map();
for(const x of [...prev,...candidates]){
 const k=x.event_id+"|"+x.url;
 if(!x.event_id||!x.url||!currentEventIds.has(x.event_id))continue;
 if(!candidateStillMatches(x,[...unique.values()]))continue;
 // Never keep a stale live state merely because the original candidate was found.
 // Recordings remain reviewable for 30 days of site history.
 if(x.status==="live"&&x.checked_at&&now-new Date(x.checked_at)>15*60000)continue;
 if(x.status==="recording"&&x.checked_at&&now-new Date(x.checked_at)>30*day)continue;
 combined.set(k,x);
}
const output={version:1,updated_at:now.toISOString(),mode:"suggestions_only",verified_public_live_count:0,
 notes:"Matches are candidates and are NOT published on event pages until independently reviewed. Platform-live ≠ event-confirmed.",
 sources:{youtube_configured:!!api.youtube,twitch_configured:!!(api.twitchId&&api.twitchSecret)},
 statistics:discoveryStats,
 // Raw platform video titles, NOT necessarily connected to any demonstration.
 diagnostic_sample:samples.slice(0,25),
 candidates:[...combined.values()].slice(0,100),errors:errors.slice(0,20)};
// Avoid 96 no-op commits per day. Only new/changed links, statuses and fresh LIVE checks
// need to be saved. A recording remains in the queue without touching its timestamps.
const stable=x=>JSON.stringify({
 version:x.version,mode:x.mode,sources:x.sources,statistics:x.statistics,errors:x.errors,diagnostic_sample:x.diagnostic_sample,
 candidates:(x.candidates||[]).map(item=>({
  ...item,checked_at:item.status==="live"?item.checked_at:undefined
 })).sort((a,b)=>(a.event_id+"|"+a.url).localeCompare(b.event_id+"|"+b.url))
});
if(!firstRun&&stable(previous)===stable(output)){
 console.log("No changed stream candidates or status.");
 console.log("Stream discovery stats:",JSON.stringify(discoveryStats),"API errors:",JSON.stringify(errors.slice(0,12)));
 process.exit(0);
}
writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");
console.log("Stream discovery candidates:",output.candidates.length,"new:",candidates.length,"errors:",errors.length);
console.log("Stream discovery stats:",JSON.stringify(discoveryStats),"API errors:",JSON.stringify(errors.slice(0,12)));
