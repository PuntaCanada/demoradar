// DemoRadar report intake. Requires TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY and GITHUB_ISSUES_TOKEN.
// This endpoint is intentionally disabled until all three variables are present.
// The token should be fine-grained and limited to Issues: write on PuntaCanada/demoradar.
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const enabled=env=>Boolean(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY&&env.GITHUB_ISSUES_TOKEN);
const typeAllowed=new Set(["Termin falsch","Termin geändert / abgesagt","Ort / Veranstalter falsch","Defekter Link / Stream","Technisches Problem","Spam / verdächtiger Inhalt","Sonstiges"]);
const plausibleLink=s=>{try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)&&u.hostname.includes(".")}catch{return false}};
function validate(body){
 if(!body||typeof body!=="object"||Array.isArray(body))return "Ungültige Angaben.";
 if(!typeAllowed.has(body.type))return "Bitte eine gültige Kategorie wählen.";
 if(typeof body.url!=="string"||body.url.length>600||!plausibleLink(body.url))return "Bitte einen gültigen öffentlichen HTTPS-Link eingeben.";
 if(typeof body.description!=="string"||body.description.trim().length<25||body.description.length>2200)return "Bitte den Fehler in 25 bis 2200 Zeichen beschreiben.";
 if(body.evidence&&(!plausibleLink(body.evidence)||body.evidence.length>600))return "Nachweis-Link ungültig.";
 if(body.website)return "Ungültige Übermittlung.";
 if(typeof body["cf-turnstile-response"]!=="string"||body["cf-turnstile-response"].length<10)return "Sicherheitsprüfung fehlt.";
 const content=body.description;
 if((content.match(/https?:\/\//gi)||[]).length>2)return "Bitte höchstens zwei Links im Beschreibungstext verwenden.";
 if(/(?:\b(?:password|passwort|kennwort|api.?key|secret|token)\s*[:=]\s*\S+)/i.test(content))return "Bitte keine Passwörter oder Zugangsdaten eintragen.";
 return null;
}
export async function onRequestGet({env}){
 return reply({enabled:enabled(env),sitekey:enabled(env)?env.TURNSTILE_SITE_KEY:null});
}
export async function onRequestPost({request,env}){
 if(!enabled(env))return reply({ok:false,error:"Meldecenter ist noch nicht aktiviert."},503);
 if(Number(request.headers.get("content-length")||0)>12000)return reply({ok:false,error:"Meldung zu groß."},413);
 let body;
 try{body=await request.json()}catch{return reply({ok:false,error:"Ungültiges Formular."},400)}
 const issue=validate(body);if(issue)return reply({ok:false,error:issue},400);
 let verified=false;
 try{
  const form=new FormData();form.append("secret",env.TURNSTILE_SECRET_KEY);form.append("response",body["cf-turnstile-response"]);
  const remoteIp=request.headers.get("CF-Connecting-IP");if(remoteIp)form.append("remoteip",remoteIp);
  const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
  const result=await r.json();verified=result.success===true;
 }catch{return reply({ok:false,error:"Sicherheitsprüfung derzeit nicht verfügbar."},503)}
 if(!verified)return reply({ok:false,error:"Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen."},403);
 // No personal details are requested; the issue itself is publicly visible on GitHub.
 const safe=s=>String(s||"").replace(/[\r\n]+/g," ").trim();
 const description=body.description.trim().replace(/\r/g,"");
 const title="[Fehler] "+safe(body.type)+" – "+new Date().toISOString().slice(0,10);
 const markdown="**Kategorie:** "+safe(body.type)+"\n\n**Betroffener Link:** "+body.url+"\n\n**Beschreibung:**\n"+description+"\n\n**Nachweis:** "+(body.evidence||"nicht angegeben")+"\n\n---\nÜber das öffentliche DemoRadar-Meldecenter eingereicht. Ungeprüfte Meldung: keine automatische Korrektur oder Sperrung.";
 try{
  const r=await fetch("https://api.github.com/repos/PuntaCanada/demoradar/issues",{
   method:"POST",headers:{"authorization":"Bearer "+env.GITHUB_ISSUES_TOKEN,"accept":"application/vnd.github+json","content-type":"application/json","user-agent":"DemoRadar-Report-Center","x-github-api-version":"2022-11-28"},
   body:JSON.stringify({title,body:markdown})
  });
  if(!r.ok)return reply({ok:false,error:"Meldung konnte nicht gespeichert werden. Bitte den alternativen Meldeweg nutzen."},502);
  const item=await r.json();
  if(!/^https:\/\/github\.com\/PuntaCanada\/demoradar\/issues\/\d+$/.test(item.html_url||""))return reply({ok:false,error:"Meldung angenommen; Bestätigung konnte nicht geprüft werden."},502);
  return reply({ok:true,issue_url:item.html_url},201);
 }catch{return reply({ok:false,error:"Meldeservice derzeit nicht erreichbar. Bitte später erneut versuchen."},503)}
}
