const http = require("http");
const fs = require("fs");
const path = require("path");
const cfg = require("./config");

const norm = (s) => (s || "").toLowerCase().replace(/[ºª°]/g, "o")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === "#") {
    const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    try { return String.fromCodePoint(n); } catch { return ""; }
  }
  return ENT[e.toLowerCase()] ?? m;
});
const limpa = (s) => {
  let t = (s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  t = decode(t).replace(/<[^>]+>/g, " ");
  t = decode(t).replace(/<[^>]+>/g, " ");
  return t.replace(/\s+/g, " ").trim();
};
const tag = (b, n) => {
  const m = b.match(new RegExp("<" + n + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + n + ">", "i"));
  return m ? m[1] : "";
};

function parseFeed(xml, fonte) {
  const blocos = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  const out = [];
  for (const b of blocos) {
    const titulo = limpa(tag(b, "title"));
    let link = limpa(tag(b, "link"));
    if (!link) { const h = b.match(/<link[^>]*href="([^"]+)"/i); link = h ? decode(h[1]) : ""; }
    const data = Date.parse(limpa(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated")));
    if (!titulo || !link || isNaN(data)) continue;
    let trecho = limpa(tag(b, "description") || tag(b, "summary"));
    let nome = fonte, url = link;
    const src = b.match(/<source[^>]*?(?:url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i);
    if (src) { nome = limpa(src[2]) || nome; url = src[1] || url; }
    let t = titulo;
    if (src && t.endsWith(" - " + nome)) t = t.slice(0, -(nome.length + 3));
    if (norm(trecho).startsWith(norm(t).slice(0, 40))) trecho = "";
    out.push({ titulo: t, link, trecho: trecho.slice(0, 180), fonte: nome, url, data });
  }
  return out;
}

async function baixa(nome, url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FuracaoDeNoticias/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return parseFeed(await r.text(), nome);
  } finally { clearTimeout(timer); }
}

const gnews = (q) => "https://news.google.com/rss/search?q=" + encodeURIComponent(q) +
  "+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const temPalavra = (texto, p) => new RegExp("(^|[^a-z0-9])" + esc(p) + "([^a-z0-9]|$)").test(texto);
const temTrecho = (texto, p) => texto.includes(p);

function classifica(it) {
  const texto = norm(it.titulo + " " + it.trecho);
  const cats = [];
  for (const [id, c] of Object.entries(cfg.categorias)) {
    if (!c.palavras.some((p) => temPalavra(texto, p))) continue;
    if (c.exigeUmDe && !c.exigeUmDe.some((p) => temTrecho(texto, p))) continue;
    cats.push(id);
  }
  return cats;
}

const STOP = new Set("para como mais pelo pela uma uns que com dos das nos nas sobre apos ante entre desde este esta esse essa seus suas quando tem ser foi sao vai ate".split(" "));
const tokens = (t) => new Set(norm(t).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));

function agrupa(itens) {
  itens.sort((a, b) => b.data - a.data);
  const grupos = [];
  for (const it of itens) {
    const tk = tokens(it.titulo);
    let achou = null;
    for (const g of grupos) {
      let inter = 0;
      for (const w of tk) if (g.tk.has(w)) inter++;
      if (inter >= 3 && inter / Math.min(tk.size, g.tk.size) >= 0.6) { achou = g; break; }
    }
    if (achou) achou.itens.push(it);
    else grupos.push({ tk, itens: [it] });
  }
  return grupos.map((g) => {
    const rep = g.itens.find((i) => i.oficial) || g.itens[0];
    const fontes = [...new Set(g.itens.map((i) => i.fonte))];
    const cats = [...new Set(g.itens.flatMap((i) => i.cats))];
    return { titulo: rep.titulo, link: rep.link, trecho: rep.trecho || g.itens.find((i) => i.trecho)?.trecho || "",
      fonte: rep.fonte, oficial: g.itens.some((i) => i.oficial), data: g.itens[0].data,
      fontes, qtd: fontes.length, cats };
  });
}

async function coleta() {
  const tarefas = cfg.fontesDiretas.map(([n, u]) => [n, u]);
  for (const q of cfg.buscasGoogle) tarefas.push(["Google Notícias", gnews(q)]);
  for (const s of cfg.portaisViaGoogle) tarefas.push([s, gnews("(" + cfg.termosDosPortais + ") site:" + s)]);
  const res = await Promise.allSettled(tarefas.map(([n, u]) => baixa(n, u)));
  const falhas = new Set(), todos = [], vistos = new Set();
  const agora = Date.now(), limite = agora - cfg.horasMaximas * 3600e3;
  res.forEach((r, i) => {
    if (r.status !== "fulfilled") { if (tarefas[i][0] !== "Google Notícias") falhas.add(tarefas[i][0]); return; }
    for (const it of r.value) {
      if (it.data < limite || it.data > agora + 3600e3) continue;
      const chave = norm(it.titulo) + "|" + it.fonte;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const alvo = norm(it.fonte + " " + it.url);
      it.oficial = cfg.oficiais.some((o) => alvo.includes(o));
      it.cats = classifica(it);
      if (it.cats.length) todos.push(it);
    }
  });
  const itens = agrupa(todos);
  return { atualizadoEm: agora, falhas: [...falhas], total: itens.length,
    abas: Object.fromEntries(Object.entries(cfg.categorias).map(([k, v]) => [k, v.nome])), itens };
}

let cache = { t: 0, dados: null }, pendente = null;
async function obter(forcar) {
  const idade = Date.now() - cache.t;
  if (cache.dados && idade < (forcar ? 60e3 : cfg.cacheMinutos * 60e3)) return cache.dados;
  if (!pendente) pendente = coleta().then((d) => { cache = { t: Date.now(), dados: d }; return d; })
    .finally(() => { pendente = null; });
  return pendente;
}

const ESTATICOS = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/manifest.json": ["manifest.json", "application/manifest+json"],
  "/icon-192.png": ["icon-192.png", "image/png"],
  "/icon-512.png": ["icon-512.png", "image/png"]
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/api/noticias") {
      const d = await obter(u.searchParams.get("refresh") === "1");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify(d));
    }
    if (u.pathname === "/health") { res.writeHead(200); return res.end("ok"); }
    const e = ESTATICOS[u.pathname];
    if (e) {
      res.writeHead(200, { "Content-Type": e[1] });
      return res.end(fs.readFileSync(path.join(__dirname, e[0])));
    }
    res.writeHead(404); res.end("Não encontrado");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ erro: String(err.message || err) }));
  }
}).listen(process.env.PORT || 3000, () => console.log("Furacão de Notícias no ar"));
