// ============================================================
// CONFIGURAÇÃO — aqui você edita fontes e palavras-chave.
// Depois de editar, salve o arquivo no GitHub: o Render atualiza sozinho.
// ============================================================
module.exports = {
  cacheMinutos: 8,     // por quanto tempo reaproveita a busca antes de buscar de novo
  horasMaximas: 48,    // ignora notícias mais velhas que isso

  // Feeds RSS diretos [nome do portal, endereço]. Se algum falhar, é ignorado.
  fontesDiretas: [
    ["G1", "https://g1.globo.com/rss/g1/politica/"],
    ["G1", "https://g1.globo.com/rss/g1/economia/"],
    ["UOL", "https://rss.uol.com.br/feed/noticias.xml"],
    ["Folha", "https://feeds.folha.uol.com.br/poder/rss091.xml"],
    ["Folha", "https://feeds.folha.uol.com.br/mercado/rss091.xml"],
    ["CNN Brasil", "https://www.cnnbrasil.com.br/feed/"],
    ["Agência Brasil", "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"],
    ["Agência Senado", "https://www12.senado.leg.br/noticias/rss"],
    ["Agência Câmara", "https://www.camara.leg.br/noticias/rss/ultimas-noticias"]
  ],

  // Portais sem feed confiável: buscados pelo Google Notícias (site:)
  portaisViaGoogle: [
    "oglobo.globo.com", "estadao.com.br", "r7.com", "terra.com.br",
    "metropoles.com", "poder360.com.br", "gov.br", "caixa.gov.br"
  ],
  termosDosPortais: '"Bolsa Família" OR BPC OR INSS OR Lula OR "governo federal"',

  // Buscas gerais no Google Notícias (centenas de portais de uma vez)
  buscasGoogle: [
    "Bolsa Família", "Auxílio Brasil", "BPC LOAS", "Auxílio Gás", "Gás do Povo",
    "Pé-de-Meia", "CadÚnico", "INSS", "aposentadoria INSS", "calendário de pagamento INSS",
    "salário mínimo", "Bolsa Família 2027", "Selic taxa de juros", "Desenrola",
    "governo Lula", "Lula discurso", "escândalo governo", "CPI INSS", "operação Polícia Federal INSS"
  ],

  // Abas. A notícia entra na aba se citar alguma palavra de "palavras".
  // "exigeUmDe": a notícia também precisa citar pelo menos uma dessas (evita ruído).
  categorias: {
    beneficios: { nome: "Benefícios", palavras: [
      "bolsa familia", "auxilio brasil", "bpc", "loas", "auxilio gas", "gas do povo",
      "pe-de-meia", "pe de meia", "seguro-desemprego", "seguro desemprego",
      "abono salarial", "cadunico", "cad unico", "tarifa social", "beneficio social" ] },
    inss: { nome: "INSS", palavras: [
      "inss", "aposentadoria", "aposentado", "aposentados", "pensao", "13o",
      "decimo terceiro", "calendario de pagamento", "salario minimo", "previdencia" ] },
    dinheiro: { nome: "Dinheiro", palavras: [
      "reajuste", "aumento", "taxa de juros", "selic", "inflacao", "imposto de renda",
      "desenrola", "isencao", "bolsa familia 2027" ],
      exigeUmDe: ["bolsa", "bpc", "inss", "aposent", "beneficio", "salario", "auxilio",
        "governo", "imposto", "juros", "selic", "desenrola", "lula"] },
    governo: { nome: "Governo", palavras: [
      "lula", "governo federal", "governo lula", "planalto", "medida provisoria",
      "ministro da fazenda", "haddad", "ministerio do desenvolvimento social" ] },
    polemicas: { nome: "Polêmicas", palavras: [
      "escandalo", "denuncia", "cpi", "operacao", "policia federal", "polemica",
      "discurso", "fala de", "critica", "stf", "investigacao" ],
      exigeUmDe: ["lula", "presidente da republica", "governo federal", "planalto",
        "ministro", "inss", "bolsa familia", "bpc"] }
  },

  // Fontes que ganham o selo "oficial" (nome do portal ou endereço contém):
  oficiais: ["gov.br", "agencia brasil", "agenciabrasil", "agencia senado", "agencia camara",
    "caixa", "camara.leg.br", "senado.leg.br"]
};
