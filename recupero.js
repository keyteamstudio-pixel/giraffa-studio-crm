/* Recupero password: il link di Supabase arriva con #type=recovery.
   Stava scritto dentro index.html. L'ho portato qui perche' una pagina
   senza script scritti a mano puo' dire alla CSP «script solo da file
   miei», e quella e' la riga che ferma davvero un codice iniettato. */
(function(){
  var h = location.hash || "";
  if (h.indexOf("type=recovery") < 0 && h.indexOf("type=invite") < 0) return;
  window.GS_RECOVERY = true;
  var q = {}; h.replace(/^#/,"").split("&").forEach(function(kv){ var i=kv.indexOf("="); if(i>0) q[kv.slice(0,i)] = decodeURIComponent(kv.slice(i+1)); });
  document.addEventListener("DOMContentLoaded", function(){
    var sb = window.supabase.createClient(window.GS_CONFIG.SUPABASE_URL, window.GS_CONFIG.SUPABASE_ANON_KEY);
    var el = function(x){ return document.querySelector(x); };
    var show = function(){
      el("#splash").classList.add("hide"); el("#login").classList.add("hide");
      el("#app").classList.add("hide"); el("#reset").classList.remove("hide");
    };
    setInterval(function(){
      if (el("#reset") && !el("#reset").classList.contains("hide")) {
        el("#splash").classList.add("hide"); el("#login").classList.add("hide"); el("#app").classList.add("hide");
      }
    }, 250);
    sb.auth.setSession({ access_token: q.access_token, refresh_token: q.refresh_token }).then(function(r){
      show();
      var mail = r && r.data && r.data.user && r.data.user.email;
      if (mail) el("#resetmail").textContent = mail;
      if (r && r.error) { el("#reseterr").textContent = "Link scaduto o gi\u00e0 usato. Richiedine uno nuovo."; el("#reseterr").classList.remove("hide"); }
    });
    el("#resetform").addEventListener("submit", function(e){
      e.preventDefault();
      var f = e.target, p1 = f.p1.value, p2 = f.p2.value, err = el("#reseterr");
      err.classList.add("hide");
      if (p1 !== p2) { err.textContent = "Le due password non coincidono."; err.classList.remove("hide"); return; }
      if (p1.length < 8) { err.textContent = "Servono almeno 8 caratteri."; err.classList.remove("hide"); return; }
      var btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Salvo\u2026";
      sb.auth.updateUser({ password: p1 }).then(function(r){
        if (r.error) { err.textContent = r.error.message; err.classList.remove("hide"); btn.disabled = false; btn.textContent = "Salva e accedi"; return; }
        history.replaceState(null, "", location.pathname);
        location.reload();
      });
    });
  });
})();
