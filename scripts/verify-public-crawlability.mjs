/**
 * Verify actual public crawlability, not only a successful HTTP status.
 * Cloudflare can return a fallback HTML page with HTTP 200 for a missing route.
 * This check inspects each route's identity, indexing directives, canonical,
 * reciprocal language alternatives, sitemap and robots.txt.
 * Passing means reachable to this client, NOT indexed by Google.
 */
export const origin="https://demoradar.pages.dev";
export const pairs=[
 ["/","/en/"],
 ["/community/","/en/community/"],
 ["/sources/","/en/sources/"],
 ["/heute/","/en/today/"],
 ["/partners/","/en/partners/"]
];
const tidy=s=>String(s||"").replace(/\s+/g," ").trim();
export const canonicalOf=html=>html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?\s*>/i)?.[1]||"";
export const alternateOf=(html,lang)=>{
 const tags=[...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/gi)].map(x=>x[0]);
 for(const tag of tags){
  const language=tag.match(/\bhreflang="([^"]+)"/i)?.[1],url=tag.match(/\bhref="([^"]+)"/i)?.[1];
  if(language===lang)return url||"";
 }
 return "";
};
export function validateSnapshot(pages,root=origin){
 const errors=[];
 const get=(url)=>pages.get(url)||null;
 const check=(ok,message)=>{if(!ok)errors.push(message)};
 const robots=get(root+"/robots.txt"),sitemap=get(root+"/sitemap.xml");
 check(robots?.status===200&&/text\/plain/i.test(robots.type||""),"robots.txt must be served as plain text with HTTP 200");
 check(sitemap?.status===200&&/xml/i.test(sitemap.type||""),"sitemap.xml must have XML content type and HTTP 200");
 if(robots?.status===200){
  check(!/Disallow:\s*\//i.test(robots.body),"robots.txt must not globally disallow crawler access");
  check(robots.body.includes("Sitemap: "+root+"/sitemap.xml"),"robots.txt must link canonical sitemap");
 }
 const sitemapBody=sitemap?.body||"";
 check(sitemapBody.includes("<urlset"),"Sitemap must contain an XML urlset, not an SPA HTML fallback");
 const routePaths=pairs.flat();
 const berlin=get(root+"/berlin/"),berlinHtml=berlin?.body||"";
 check(berlin?.status===200,"Berlin page not HTTP 200");
 check(/text\/html/i.test(berlin?.type||""),"Berlin page must be served as HTML");
 check(/<html[^>]*lang="de"/i.test(berlinHtml),"Berlin route must be German HTML, not generic fallback");
 check(canonicalOf(berlinHtml)===root+"/berlin/","Berlin self-canonical missing or fallback");
 check(/<h1>Demonstrationen in Berlin<\/h1>/.test(berlinHtml),"Berlin heading missing or fallback");
 check(/<meta name="description" content="[^"]+"/.test(berlinHtml),"Berlin description missing");
 check(/Stand der Übersicht: 20\d{2}-\d{2}-\d{2}/.test(berlinHtml),"Berlin static date missing");
 check(/Quelleneinträge/.test(berlinHtml)&&/Quellenabdeckung/.test(berlinHtml),"Berlin source and coverage disclosure missing");
 check(!/<meta[^>]*content="[^"]*noindex/i.test(berlinHtml),"Berlin unexpectedly noindex");
 const actualLocations=[...sitemapBody.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 check(actualLocations.length===routePaths.length+1,"Sitemap must contain ten language routes plus Berlin");
 check(actualLocations.includes(root+"/berlin/"),"Berlin must be in sitemap");
 check(new Set(actualLocations).size===actualLocations.length,"Sitemap must not duplicate canonical locations");
 for(const path of routePaths)check(actualLocations.includes(root+path),"Missing sitemap URL: "+path);
 for(const [de,en] of pairs){
  for(const [route,language,other] of [[de,"de",en],[en,"en",de]]){
   const url=root+route,item=get(url),html=item?.body||"";
   check(item?.status===200,"Page not HTTP 200: "+route);
   check(/text\/html/i.test(item?.type||""),"Page is not served as HTML: "+route);
   check(new RegExp('<html[^>]*lang="'+language+'"','i').test(html),"Incorrect language or generic fallback on "+route);
   check(/<title>[^<]+<\/title>/i.test(html),"Missing crawlable HTML title: "+route);
   check(/<meta[^>]+name="description"[^>]+content="[^"]+"/i.test(html),"Missing HTML description: "+route);
   check(/<h1\b[^>]*>[^<]+<\/h1>/i.test(html)||/<h1\b[^>]*>[\s\S]{5,200}<\/h1>/i.test(html),"Missing crawlable heading: "+route);
   check(canonicalOf(html)===url,"Incorrect self-canonical or fallback page: "+route);
   check(alternateOf(html,language)===url,"Missing same-language alternate: "+route);
   check(alternateOf(html,language==="de"?"en":"de")===root+other,"Missing reciprocal language alternate: "+route);
   check(alternateOf(html,"x-default")===root+de,"Missing language-neutral alternate: "+route);
   check(!/<meta[^>]*content="[^"]*noindex/i.test(html),"Unexpected noindex: "+route);
   const entry=sitemapBody.match(new RegExp("<url><loc>"+url.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"<\\/loc>([\\s\\S]*?)<\\/url>"))?.[1]||"";
   check(entry.includes('hreflang="de"')&&entry.includes('hreflang="en"')&&entry.includes('hreflang="x-default"'),
     "Incomplete multilingual sitemap entries: "+route);
  }
 }
 return {ok:errors.length===0,errors,checkedRoutes:routePaths.length+1};
}
export async function fetchSnapshot(root=origin){
 const paths=["/robots.txt","/sitemap.xml","/berlin/",...pairs.flat()],map=new Map();
 await Promise.all(paths.map(async p=>{
  try{
   const response=await fetch(root+p,{redirect:"follow",cache:"no-store",headers:{"User-Agent":"DemoRadar-CrawlabilityAudit/1.0"}});
   map.set(root+p,{status:response.status,type:response.headers.get("content-type")||"",body:(await response.text()).slice(0,600000)});
  }catch(error){map.set(root+p,{status:0,type:"",body:"",error:String(error)})}
 }));
 return map;
}
if(process.argv[1]&&new URL("file://"+process.argv[1]).href===import.meta.url){
 if(!process.argv.includes("--live"))throw Error("Use --live to audit public Cloudflare website");
 let finalResult={ok:false,errors:["No response"]};
 for(let attempt=1;attempt<=12;attempt++){
  finalResult=validateSnapshot(await fetchSnapshot());
  if(finalResult.ok)break;
  console.log("Public crawlability attempt",attempt,"failed:",finalResult.errors.slice(0,5).join(" | "));
  if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));
 }
 if(!finalResult.ok){console.error(finalResult.errors.join("\n"));process.exitCode=1}
 else console.log("Public crawlability OK:",finalResult.checkedRoutes,"HTML pages (including Berlin), robots and sitemap (not proof of Google indexing)");
}
