import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import vm from "node:vm";
const origin="https://demoradar.pages.dev";
const original=readFileSync("index.html","utf8");
const file=readFileSync("i18n.js","utf8");
const begin=file.indexOf("const dictionary=");
const end=file.indexOf(";\n// Route",begin);
if(begin<0||end<0)throw Error("Dictionary not found");
const translations=vm.runInNewContext("("+file.slice(begin+"const dictionary=".length,end)+")");
if(!translations.en||!translations.de)throw Error("Missing languages");
const canonical=lang=>lang==="en"?origin+"/en/":origin+"/";
const links=lang=>'<link rel="canonical" href="'+canonical(lang)+'"><link rel="alternate" hreflang="de" href="'+origin+'/"><link rel="alternate" hreflang="en" href="'+origin+'/en/"><link rel="alternate" hreflang="x-default" href="'+origin+'/">';
function addSeo(html,lang){
 html=html.replace(/<link rel="canonical"[^>]*>/g,"").replace(/<link rel="alternate" hreflang="(?:de|en|x-default)"[^>]*>/g,"");
 html=html.replace(/<html lang="[^"]*">/,'<html lang="'+lang+'">');
 html=html.replace(/<title>[^<]*<\/title>/,"<title>"+translations[lang]["page.title"]+"</title>");
 html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+translations[lang]["page.description"]+'">');
 html=html.replace("</title>","</title>"+links(lang));
 return html;
}
const escapeHTML=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const escapeAttr=s=>escapeHTML(s).replace(/"/g,"&quot;");
function buildEnglish(){
 let html=addSeo(original,"en");
 html=html.replace(/<([a-z][\w-]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([^<]*)<\/\1>/g,
  (whole,tag,attributes,key,content)=>{
   if(!(key in translations.en))throw Error("Missing English text: "+key);
   return "<"+tag+attributes+">"+escapeHTML(translations.en[key])+"</"+tag+">";
  });
 html=html.replace(/(<input\b[^>]*data-i18n-placeholder="([^"]+)"[^>]*\bplaceholder=")[^"]*(")/g,
  (_,prefix,key,end)=>prefix+escapeAttr(translations.en[key]||key)+end);
 html=html.replace(/(<[^>]*data-i18n-aria="([^"]+)"[^>]*\baria-label=")[^"]*(")/g,
  (_,prefix,key,end)=>prefix+escapeAttr(translations.en[key]||key)+end);
 html=html.replace("Diese Website befindet sich im Aufbau. Es sind noch keine Live-Daten verbunden. Das Fehlen eines Termins bedeutet nicht, dass keine Demonstration stattfindet.","This website is in beta. An event missing from our sources does not mean it will not take place.");
 html=html.replace("🚧 Vorschau:","🚧 Preview:");
 html=html.replace("Keine verifizierten Termine eingetragen","No verified events listed yet");
 html=html.replace("Live-Daten werden vorbereitet","Loading live event data");
 html=html.replace("Noch keine verifizierten Termine","No verified events yet");
 html=html.replace("Die Filter sind vorbereitet. Nach Anbindung geprüfter Quellen erscheinen hier automatisch Veranstaltungen mit Quellen- und Aktualisierungsangaben.","Events from checked sources will appear here with attribution and update details.");
 html=html.replace(/href="\/community\/"/g,'href="/en/community/"');
 html=html.replace(/href="\/sources\/"/g,'href="/en/sources/"');
 html=html.replace('data-language="de" aria-pressed="true"','data-language="de" aria-pressed="false"').replace('data-language="en" aria-pressed="false"','data-language="en" aria-pressed="true"');
 return html;
}
const de=addSeo(original,"de");
if(de!==original)writeFileSync("index.html",de);
mkdirSync("en",{recursive:true});
writeFileSync("en/index.html",buildEnglish());
const alternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/"/>';
const sourceAlternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/sources/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/sources/"/>';
const communityAlternate='<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="de" href="'+origin+'/community/"/><xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="'+origin+'/en/community/"/>';
writeFileSync("sitemap.xml",'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>'+origin+'/</loc>'+alternate+'</url>\n<url><loc>'+origin+'/en/</loc>'+alternate+'</url>\n<url><loc>'+origin+'/community/</loc>'+communityAlternate+'</url>\n<url><loc>'+origin+'/en/community/</loc>'+communityAlternate+'</url>\\n<url><loc>'+origin+'/sources/</loc>'+sourceAlternate+'</url>\\n<url><loc>'+origin+'/en/sources/</loc>'+sourceAlternate+'</url>\\n</urlset>\\n');
writeFileSync("robots.txt","User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml\n");
console.log("Built German and English indexable routes and multilingual sitemap");
