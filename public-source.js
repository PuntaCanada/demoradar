"use strict";

(function () {
 const berlin="https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/";
 const berlinFeedPath=new URL("index.php/index/all.json",berlin).pathname;
 const dresden="https://www.dresden.de/de/rathaus/dienstleistungen/versammlungsuebersicht.php";

 function publicSourceUrl(value) {
  if(typeof value!=="string"||!/^https:\/\//i.test(value)||/[\\\x00-\x20\x7f]/.test(value))return "";
  try {
   const u=new URL(value);
   if(u.username||u.password||u.port||!u.hostname.includes("."))return "";
   const host=u.hostname.replace(/\.$/,"");
   const path=decodeURIComponent(u.pathname);
   if(["berlin.de","www.berlin.de"].includes(host)&&path===berlinFeedPath)return berlin;
   if(["dresden.de","www.dresden.de"].includes(host)&&path==="/data_ext/versammlungsuebersicht/Versammlungen.json")return dresden;
   if(host==="api.demonstrations.org"&&/^\/v1\/event\/(?:\d+|all)\/?$/.test(path))return "https://demonstrations.org/en/data";
   if(host.startsWith("api.")||/\.(?:json|xml|geojson|csv|rss|atom)(?:\/|$)/i.test(path))return "";
   return u.href;
  }catch{return "";}
 }

 if(typeof module==="object"&&module.exports)module.exports=publicSourceUrl;
 else globalThis.publicSourceUrl=publicSourceUrl;
})();
