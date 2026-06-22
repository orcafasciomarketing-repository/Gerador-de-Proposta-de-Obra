let currentPage = 1;
let exclTags = [];
let promptGerado = "";
let logosData = { contratado: null, contratante: null };
const elistData = {
  "tipo-obra": [],
  regime: [],
  pagamento: [],
  reajuste: [],
  premissas: [],
  "servicos-custom": [],
};

// ─── DADOS ───────────────────────────────────────────────────────────────────
const SERVICOS_LISTA = [
  "Serviços preliminares e canteiro de obras",
  "Terraplenagem e fundações",
  "Estrutura (concreto armado / metálica / madeira)",
  "Alvenaria e vedações",
  "Cobertura (telhado / laje impermeabilizada)",
  "Instalações elétricas (baixa tensão)",
  "Instalações hidrossanitárias",
  "Instalações de gás",
  "SPDA (para-raios)",
  "Ar-condicionado e climatização",
  "Revestimentos (argamassa, cerâmica, porcelanato)",
  "Pintura interna e externa",
  "Forro (gesso / PVC / drywall)",
  "Esquadrias (portas e janelas)",
  "Vidros e fechamentos",
  "Louças e metais",
  "Impermeabilização",
  "Piso elevado / piso industrial",
  "Calçadas, passeios e pisos externos",
  "Limpeza final de obra",
  "ART / RRT de execução",
  "Demolições e remoção de entulho",
];
const EXCL_SUGESTOES = ["Mobiliário e decoração", "Paisagismo e jardinagem avançada", "Equipamentos de cozinha", "Sistema de automação", "Painéis fotovoltaicos", "Piscina e spa", "Elevadores e plataformas", "Climatização central", "Projetos executivos", "Análise de solo / sondagem", "Alvará e licenças", "Taxas e impostos", "Seguro de obra"];

// ─── UTILS ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function showToast(msg, dur = 3000) {
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}

// ─── LOGOS ───────────────────────────────────────────────────────────────────
function handleLogo(tipo, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Arquivo muito grande. Máximo 2 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(300 / img.width, 100 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      logosData[tipo] = compressed;
      document.getElementById("lp-" + tipo).innerHTML = `<img src="${compressed}" class="logo-preview" alt="Logo">
         <div style="font-size:11px;color:var(--green);margin-top:5px;font-weight:600">✓ ${file.name}</div>
         <div style="font-size:10.5px;color:var(--muted);margin-top:2px;cursor:pointer;text-decoration:underline" onclick="removeLogo('${tipo}')">Remover</div>`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
// ─── MÁSCARAS DE CAMPO ───────────────────────────────────────────────────────
function mascaraTel(el) {
  let v = el.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) {
    // Celular: (00) 00000-0000
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  } else if (v.length > 6) {
    // Fixo: (00) 0000-0000
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d*)/, "($1) $2");
  } else if (v.length > 0) {
    v = "(" + v;
  }
  el.value = v;
}

function mascaraCNPJ(el) {
  let v = el.value.replace(/\D/g, "");
  if (v.length > 14) v = v.slice(0, 14);
  if (v.length > 11) {
    // CNPJ: 00.000.000/0001-00 (prioritário — nome do campo é CNPJ ou CPF)
    if (v.length <= 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    else if (v.length <= 14) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  } else {
    // CPF: 000.000.000-00
    if (v.length <= 3) v = v.replace(/^(\d{1,3})/, "$1");
    else if (v.length <= 6) v = v.replace(/^(\d{3})(\d{1,3})/, "$1.$2");
    else if (v.length <= 9) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    else v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  }
  el.value = v;
}

function mascaraValor(el) {
  let v = el.value.replace(/\D/g, "");
  if (!v) {
    el.value = "";
    return;
  }
  // Formatar como moeda BRL
  const num = parseInt(v, 10);
  el.value = "R$ " + (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── CORES DA IDENTIDADE VISUAL ──────────────────────────────────────────────
function syncCor(tipo) {
  const colorInput = document.getElementById("cor-" + tipo);
  const hexInput = document.getElementById("cor-" + tipo + "-hex");
  if (document.activeElement === hexInput) {
    const v = hexInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) colorInput.value = v;
  } else {
    hexInput.value = colorInput.value;
  }
}
function getCores() {
  return {
    primaria: document.getElementById("cor-primaria")?.value || "#1560F5",
    secundaria: document.getElementById("cor-secundaria")?.value || "#0A1A5C",
  };
}

function removeLogo(tipo) {
  logosData[tipo] = null;
  document.getElementById("lp-" + tipo).innerHTML = `<div style="font-size:24px;margin-bottom:5px">${tipo === "contratado" ? "🏢" : "🏗️"}</div>
     <div class="logo-upload-label"><strong>Clique para subir</strong></div>
     <div class="logo-upload-hint">PNG, JPG ou SVG · até 2 MB</div>`;
  document.getElementById("li-" + tipo).value = "";
}

// ─── PRAZO ───────────────────────────────────────────────────────────────────
function togglePrazoOutro() {
  const sel = document.getElementById("prazo-unidade").value;
  document.getElementById("prazo-outro").style.display = sel === "_outro" ? "block" : "none";
}
function getPrazo() {
  const num = document.getElementById("prazo-num").value.trim();
  const un = document.getElementById("prazo-unidade").value;
  if (un === "_outro") return document.getElementById("prazo-outro").value.trim() || num;
  return num ? num + " " + un : "";
}

// ─── ELIST ───────────────────────────────────────────────────────────────────
function ea(id) {
  const inp = document.getElementById(id + "-input"),
    v = inp.value.trim();
  if (!v) {
    showToast("Digite um valor antes de adicionar.");
    return;
  }
  elistData[id].push(v);
  inp.value = "";
  er(id);
  inp.focus();
}
function es(id, v) {
  if (elistData[id].includes(v)) {
    showToast("Item já adicionado.");
    return;
  }
  elistData[id].push(v);
  er(id);
}
function edel(id, i) {
  elistData[id].splice(i, 1);
  er(id);
}
function er(id) {
  document.getElementById(id + "-items").innerHTML = elistData[id]
    .map(
      (t, i) => `
    <div class="elist-item">
      <span class="elist-text">${esc(t)}</span>
      <button class="elist-del" onclick="edel('${id}',${i})">×</button>
    </div>`,
    )
    .join("");
}

// ─── CHECKBOXES ──────────────────────────────────────────────────────────────
function toggleChk(i) {
  const chk = document.getElementById("chk-" + i),
    lbl = document.getElementById("chk-lbl-" + i);
  chk.checked = !chk.checked;
  lbl.classList.toggle("checked", chk.checked);
}

// ─── TAGS EXCLUSÕES ──────────────────────────────────────────────────────────
function addExcl(t) {
  if (exclTags.includes(t)) {
    showToast("Item já adicionado.");
    return;
  }
  exclTags.push(t);
  renderExcl();
}
function removeExcl(t) {
  exclTags = exclTags.filter((x) => x !== t);
  renderExcl();
}
function renderExcl() {
  document.getElementById("excl-tags").innerHTML = exclTags.map((t) => `<span class="tag">${esc(t)}<span class="tag-x" onclick="removeExcl('${t.replace(/'/g, "\\'")}')">×</span></span>`).join("");
}

// ─── NAVEGAÇÃO ───────────────────────────────────────────────────────────────
let maxStepReached = 1;

function setStep(n) {
  if (n > maxStepReached) maxStepReached = n;
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById("step-" + i);
    s.classList.remove("active", "done");
    if (i < n) s.classList.add("done");
    else if (i === n) s.classList.add("active");
    // Tornar clicável se já foi visitado
    s.style.cursor = i <= maxStepReached ? "pointer" : "default";
    s.style.opacity = i <= maxStepReached ? "1" : "0.5";
    s.onclick =
      i <= maxStepReached
        ? (() => {
            const step = i;
            return () => navigateToStep(step);
          })()
        : null;
  }
}

function navigateToStep(n) {
  if (n > maxStepReached) return; // não pode pular à frente sem preencher
  if (n <= 3) {
    // Voltar ao formulário
    document.getElementById("section-prompt").style.display = "none";
    document.getElementById("section-result").style.display = "none";
    document.getElementById("section-form").style.display = "block";
    document.getElementById("steps-bar").style.display = "flex";
    // Esconder todas as páginas, mostrar a certa
    for (let i = 1; i <= 3; i++) document.getElementById("page-" + i).style.display = i === n ? "block" : "none";
    currentPage = n;
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (n === 4) {
    document.getElementById("section-form").style.display = "none";
    document.getElementById("section-result").style.display = "none";
    document.getElementById("section-prompt").style.display = "block";
    document.getElementById("steps-bar").style.display = "flex";
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (n === 5) {
    if (document.getElementById("doc-content").innerHTML.trim() === "") return;
    document.getElementById("section-form").style.display = "none";
    document.getElementById("section-prompt").style.display = "none";
    document.getElementById("section-result").style.display = "block";
    document.getElementById("steps-bar").style.display = "flex";
    setStep(5);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function goPage(n) {
  if (n > currentPage && !validatePage(currentPage)) return;
  document.getElementById("page-" + currentPage).style.display = "none";
  currentPage = n;
  document.getElementById("page-" + n).style.display = "block";
  setStep(n);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function validatePage(n) {
  if (n === 1) {
    if (!elistData["tipo-obra"].length) {
      showToast("Adicione ao menos um tipo de obra.");
      return false;
    }
    if (!elistData["regime"].length) {
      showToast("Adicione ao menos um regime de execução.");
      return false;
    }
  }
  if (n === 2) {
    const checked = document.querySelectorAll("#servicos-grid input:checked");
    if (!checked.length && !elistData["servicos-custom"].length) {
      showToast("Selecione ou adicione ao menos um serviço.");
      return false;
    }
    if (!document.getElementById("prazo-num").value.trim()) {
      showToast("Informe o prazo de execução.");
      return false;
    }
    if (!elistData["pagamento"].length) {
      showToast("Adicione ao menos uma forma de pagamento/medição.");
      return false;
    }
  }
  return true;
}
function voltarForm() {
  document.getElementById("section-prompt").style.display = "none";
  document.getElementById("section-form").style.display = "block";
  document.getElementById("steps-bar").style.display = "flex";
  document.getElementById("page-3").style.display = "block";
  currentPage = 3;
  setStep(3);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function voltarPrompt() {
  document.getElementById("section-result").style.display = "none";
  document.getElementById("section-prompt").style.display = "block";
  setStep(4);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  if (!confirm("Iniciar nova consulta? Os dados serão perdidos.")) return;
  location.reload();
}

// ─── COLETA ──────────────────────────────────────────────────────────────────
function collectData() {
  const checked = [...document.querySelectorAll("#servicos-grid input:checked")].map((c) => c.value);
  const dataDoc = document.getElementById("data-documento").value;
  const dataFormatada = dataDoc ? new Date(dataDoc + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return {
    tipoObra: elistData["tipo-obra"].join("; "),
    regime: elistData["regime"].join("; "),
    local: document.getElementById("local").value.trim() || "a definir",
    area: document.getElementById("area").value.trim(),
    valor: document.getElementById("valor").value.trim(),
    dataInicio: document.getElementById("data-inicio").value.trim() || "após assinatura do contrato",
    objeto: document.getElementById("objeto").value.trim(),
    prazo: getPrazo(),
    pagamento: elistData["pagamento"].join("; "),
    reajuste: elistData["reajuste"].length ? elistData["reajuste"].join("; ") : "Sem previsão de reajuste",
    servicos: [...checked, ...elistData["servicos-custom"]],
    exclusoes: [...exclTags],
    premissas: [...elistData["premissas"]],
    obs: document.getElementById("obs-extras").value.trim(),
    nomeContratado: document.getElementById("nome-contratado").value.trim(),
    cnpjContratado: document.getElementById("cnpj-contratado") ? document.getElementById("cnpj-contratado").value.trim() : "",
    nomeContratante: document.getElementById("nome-contratante").value.trim(),
    repContratado: document.getElementById("rep-contratado").value.trim(),
    emailContratado: document.getElementById("email-contratado") ? document.getElementById("email-contratado").value.trim() : "",
    telContratado: document.getElementById("tel-contratado") ? document.getElementById("tel-contratado").value.trim() : "",
    repContratante: document.getElementById("rep-contratante").value.trim(),
    dataDocumento: dataFormatada,
    cidadeDocumento: document.getElementById("cidade-documento").value.trim(),
    validadeNum: document.getElementById("validade-num") ? document.getElementById("validade-num").value.trim() : "",
    validadeUnidade: document.getElementById("validade-unidade") ? document.getElementById("validade-unidade").value : "dias",
  };
}

// ─── GERAR PROMPT ────────────────────────────────────────────────────────────
function gerarPrompt() {
  if (!validatePage(3)) return;
  const d = collectData();
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  promptGerado = `Você é um especialista em contratos de engenharia civil e construção no Brasil.

Gere um ESCOPO DE SERVIÇOS profissional e completo para uma proposta de obra. O documento deve ser técnico, claro e proteger juridicamente o Contratado.

DADOS DA OBRA:
- Tipo de obra: ${d.tipoObra}
- Regime de execução: ${d.regime}
- Local: ${d.local}${d.area ? "\n- Área: " + d.area : ""}${d.valor ? "\n- Valor estimado: " + d.valor : ""}
- Objeto: ${d.objeto || (d.tipoObra ? "(elabore com base no tipo de obra)" : "não informado")}
- Prazo de execução: ${d.prazo || "a definir"}
- Início previsto: ${d.dataInicio}
- Forma de pagamento/medição: ${d.pagamento}
- Reajuste de preço: ${d.reajuste}

SERVIÇOS INCLUÍDOS:
${d.servicos.length ? d.servicos.map((s) => "• " + s).join("\n") : "• A detalhar conforme planilha de quantitativos"}
${d.exclusoes.length ? "\nITENS EXCLUÍDOS DO ESCOPO:\n" + d.exclusoes.map((t) => "• " + t).join("\n") : ""}
${d.premissas.length ? "\nPREMISSAS E CONDIÇÕES:\n" + d.premissas.map((p) => "• " + p).join("\n") : ""}
${d.obs ? "\nOBSERVAÇÕES: " + d.obs : ""}

---

Gere o documento com as seções abaixo, em linguagem técnica e jurídica.
IMPORTANTE: Para cada seção, antes do texto técnico, inclua uma linha de orientação entre colchetes duplos [[assim]] explicando o que o profissional deve verificar ou personalizar antes de enviar ao cliente. Essas orientações serão destacadas em laranja na ferramenta e removidas antes do envio.

## 1. Objeto do Contrato
## 2. Informações Gerais da Obra (use uma tabela)
## 3. Serviços Incluídos no Escopo
## 4. Exclusões do Escopo
## 5. Premissas e Condições de Execução
## 6. Prazo de Execução e Vigência
## 7. Forma de Pagamento e Medição
## 8. Reajuste de Preço
## 9. Rescisão Contratual
## 10. Alertas e Recomendações (3 a 5 pontos específicos para este tipo de obra — em caixas de orientação [[assim]])

Data da proposta: ${d.dataDocumento}${d.validadeNum ? "\nValidade da proposta: " + d.validadeNum + " " + d.validadeUnidade : ""}`;

  document.getElementById("section-form").style.display = "none";
  document.getElementById("steps-bar").style.display = "flex";
  document.getElementById("section-prompt").style.display = "block";
  setStep(4);
  document.getElementById("prompt-box").textContent = promptGerado;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyPrompt() {
  if (!promptGerado) {
    showToast("Monte o prompt primeiro.");
    return;
  }
  navigator.clipboard.writeText(promptGerado)
    .then(() => showToast("✓ Prompt copiado! Abra uma IA e cole com Ctrl+V."))
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = promptGerado;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("✓ Prompt copiado! Abra uma IA e cole com Ctrl+V.");
    });
}

// ─── FORMATAR ESCOPO ─────────────────────────────────────────────────────────
function formatarEscopo() {
  const texto = document.getElementById("escopo-paste").value.trim();
  if (!texto) {
    showToast("Cole o texto gerado pela IA antes de formatar.");
    return;
  }
  const d = collectData();
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Cabeçalho com logos
  // ── Cabeçalho do documento ──────────────────────────────────────────────────

  // Logos: só renderiza se houver imagem ou nome
  const blocoLogoContratado =
    logosData.contratado || d.nomeContratado
      ? `<div class="doc-logo-box">
      ${logosData.contratado ? `<img src="${logosData.contratado}" alt="${esc(d.nomeContratado || "Contratado")}" class="doc-logo-img">` : ""}
      ${d.nomeContratado ? `<span class="doc-logo-label">${esc(d.nomeContratado)}</span>` : ""}
    </div>`
      : "";
  const blocoLogoContratante =
    logosData.contratante || d.nomeContratante
      ? `<div class="doc-logo-box">
      ${logosData.contratante ? `<img src="${logosData.contratante}" alt="${esc(d.nomeContratante || "Contratante")}" class="doc-logo-img">` : ""}
      ${d.nomeContratante ? `<span class="doc-logo-label">${esc(d.nomeContratante)}</span>` : ""}
    </div>`
      : "";
  const temLogos = blocoLogoContratado || blocoLogoContratante;
  const logosHtmlBloco = temLogos
    ? `<div class="doc-logos">
    ${blocoLogoContratado}
    <div style="flex:1"></div>
    ${blocoLogoContratante}
  </div>`
    : "";

  // ATT — só aparece se tiver representante ou empresa do contratante
  const attHtml =
    d.repContratante || d.nomeContratante
      ? `<div class="doc-att">
    ${d.repContratante ? `<div><strong>Att:</strong> ${esc(d.repContratante)}</div>` : ""}
    ${d.nomeContratante ? `<div><strong>Empresa:</strong> ${esc(d.nomeContratante)}</div>` : ""}
  </div>`
      : "";

  // Título principal: "PROPOSTA DE SERVIÇOS" + tipo de obra
  const tituloProposta = `<div class="doc-titulo-proposta">Proposta de serviços</div>
  ${d.tipoObra ? `<div class="doc-subtitulo-tipo">${esc(d.tipoObra.toUpperCase())}</div>` : ""}`;

  const cabecalhoHtml = logosHtmlBloco + tituloProposta + attHtml;

  // Rodapé de assinaturas
  // Função auxiliar para linha da tabela do rodapé
  function rdLinha(label, valor) {
    return valor ? `<tr><td>${label}</td><td>${esc(valor)}</td></tr>` : "";
  }

  const rodapeHtml = `<div class="doc-rodape">
    <div class="doc-rodape-col">
      <div class="doc-rodape-col-label">Contratado</div>
      <table>
        ${rdLinha("Razão social / Nome", d.nomeContratado)}
        ${rdLinha("CNPJ / CPF", d.cnpjContratado)}
        ${rdLinha("Representante", d.repContratado)}
        ${rdLinha("E-mail", d.emailContratado)}
        ${rdLinha("Telefone / WhatsApp", d.telContratado)}
        ${rdLinha("Cidade / UF", d.cidadeDocumento)}
      </table>
    </div>
    <div class="doc-rodape-col">
      <div class="doc-rodape-col-label">Contratante</div>
      <table>
        ${rdLinha("Razão social / Nome", d.nomeContratante)}
        ${rdLinha("Representante", d.repContratante)}
      </table>
    </div>
  </div>
  <div class="doc-data-validade">
    <div class="doc-data-item">
      <span class="doc-data-label">Data da proposta</span>
      <span class="doc-data-valor">${d.dataDocumento}</span>
    </div>
    ${
      d.validadeNum
        ? `<div class="doc-data-item">
      <span class="doc-data-label">Validade da proposta</span>
      <span class="doc-data-valor">${esc(d.validadeNum)} ${esc(d.validadeUnidade)}</span>
    </div>`
        : ""
    }
  </div>`;

  // Aplicar cores da identidade visual ao documento
  const cores = getCores();
  const docEl = document.getElementById("doc-content");
  // Atualizar variáveis CSS do documento com as cores escolhidas
  docEl.style.setProperty("--doc-primary", cores.primaria);
  docEl.style.setProperty("--doc-secondary", cores.secundaria);
  // Rodapé timbrado
  const rodapeTexto = document.getElementById("rodape-texto") ? document.getElementById("rodape-texto").value.trim() : "";
  const rodapeHtmlFinal = rodapeTexto ? `<div class="rodape-doc">${rodapeTexto}</div>` : "";

  docEl.innerHTML = cabecalhoHtml + md2html(texto) + rodapeHtml + rodapeHtmlFinal;

  document.getElementById("result-sub").textContent = "Gerado em " + d.dataDocumento + " · " + d.tipoObra;
  document.getElementById("section-prompt").style.display = "none";
  document.getElementById("section-result").style.display = "block";
  setStep(5);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── MARKDOWN → HTML (com detecção de orientações [[...]]) ────────────────────
// ─── TITLE CASE ─────────────────────────────────────────────────────────────
// Preposições, artigos e conjunções que ficam minúsculos (exceto no início)
const TC_MINUSC = new Set(["a", "à", "ao", "aos", "às", "com", "contra", "da", "das", "de", "do", "dos", "e", "em", "entre", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos", "per", "por", "sem", "sob", "sobre", "um", "uma", "uns", "umas", "que", "se", "até", "após", "ante", "desde", "durante", "mediante", "perante", "segundo", "via"]);
// Siglas que devem ficar em maiúsculas
const TC_SIGLAS = new Set(["abnt", "art", "arts", "bim", "bndes", "cef", "cnpj", "cpf", "cnd", "crea", "cau", "art", "rrt", "spda", "incc", "ipca", "cub", "fgv", "itbi", "iss", "icms", "pis", "cofins", "gf", "nbr", "iso", "cdc", "iss", "inss", "fgts", "a4", "s/a", "ltda", "mei", "epp", "eire", "sa"]);

function titleCase(str) {
  // Preservar prefixo numérico (ex: "1.", "10.")
  const numMatch = str.match(/^(\d+\.?\s*)/);
  const prefix = numMatch ? numMatch[1] : "";
  const rest = numMatch ? str.slice(prefix.length) : str;

  // Converter toda a string para minúsculo primeiro
  const words = rest.toLowerCase().split(/\s+/);

  const result = words.map((w, i) => {
    if (!w) return w;
    // Remover pontuação para checar sigla
    const clean = w.replace(/[^a-záéíóúâêôàãõçü]/gi, "");
    // Manter siglas em maiúsculo
    if (TC_SIGLAS.has(clean)) return w.toUpperCase();
    // Números romanos (I, II, III, IV, V, VI, VII, VIII, IX, X)
    if (/^[ivxlcdm]+$/.test(clean) && clean.length <= 6 && i > 0) return w.toUpperCase();
    // Preposições/artigos internos ficam minúsculos
    if (i > 0 && TC_MINUSC.has(clean)) return w;
    // Capitalizar primeira letra
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return prefix + result.join(" ");
}

function md2html(md) {
  // Detectar orientações [[...]] e converter em blocos destacados
  md = md.replace(/\[\[([^\]]+)\]\]/g, (m, txt) => `\nORIENTACAO:${txt.trim()}\n`);

  // ── Filtros de limpeza — removem padrões gerados pela IA que não devem aparecer ──

  // 1. Separadores (---, ***, ___)
  md = md.replace(/^[-*_]{3,}\s*$/gm, "");

  // 2. Data de referência / Data da proposta / Validade — remover do corpo (ficam só no rodapé)
  md = md.replace(/^[#*\-\s]*[Dd]ata\s+de\s+[Rr]efer[eê]ncia[^\n]*$/gm, "");
  md = md.replace(/^[#*\-\s]*[Dd]ata\s+da\s+[Pp]roposta[^\n]*$/gm, "");
  md = md.replace(/^[#*\-\s]*[Vv]alidade\s+da\s+[Pp]roposta[^\n]*$/gm, "");
  md = md.replace(/^[#*\-\s]*[Dd]ata\s*:[^\n]*$/gm, "");
  // Linhas de lista que contenham "Data da proposta" ou "Validade"
  md = md.replace(/^\s*[-*]\s+[Dd]ata[^\n]*$/gm, "");
  md = md.replace(/^\s*[-*]\s+[Vv]alidade[^\n]*$/gm, "");

  // 3. Qualquer variação de "ESCOPO DE SERVIÇOS" como título ou parágrafo
  //    Ex: "# ESCOPO DE SERVIÇOS", "## ESCOPO DE SERVIÇOS – EMPREITADA GLOBAL", etc.
  md = md.replace(/^#{0,6}\s*ESCOPO DE SERVI[ÇC]OS[^\n]*$/gim, "");

  // 4. "Fim do Escopo de Serviços" e variações
  md = md.replace(/^[#\s]*[Ff]im\s+do\s+[Ee]scopo[^\n]*$/gm, "");

  // 5. Seção de alertas/recomendações e todo conteúdo após ela
  md = md.replace(/^#{1,3}\s*\d*\.?\s*ALERTAS\s+E\s+RECOMENDA[ÇC][ÕO]ES[\s\S]*/gim, "");

  // 6. Referências de rodapé ([1]: https://..., [Planalto][1], etc.)
  md = md.replace(/^\[\d+\]:.*$/gm, "");
  md = md.replace(/\[Planalto\]\[\d+\]/g, "");
  md = md.replace(/\[\d+\](?!:)/g, ""); // remove citações inline tipo [1]

  // 7. Parágrafos introdutórios genéricos da IA (linha inteira que contenha esses padrões)
  md = md.replace(/^.*[Ss]egue\s+(um|o)\s+modelo\s+(profissional|completo)[^\n]*$/gm, "");
  md = md.replace(/^.*[Aa]baixo\s+está\s+um\s+modelo[^\n]*$/gm, "");
  md = md.replace(/^.*[Uu]sei\s+como\s+base\s+jurídica[^\n]*$/gm, "");
  md = md.replace(/^.*estruturado\s+para\s+compor\s+proposta[^\n]*$/gm, "");
  md = md.replace(/^.*foco\s+na\s+proteção\s+do\s+[Cc]ontratado[^\n]*$/gm, "");
  md = md.replace(/^.*pronto\s+para\s+revisão\s+e\s+adaptação[^\n]*$/gm, "");
  md = md.replace(/^.*[Cc]om\s+base\s+jurídica\s+geral[^\n]*$/gm, "");
  // Linha que menciona artigos do Código Civil (610 a 626, etc.)
  md = md.replace(/^.*arts?\.\s*\d{3}\s+a\s+\d{3}[^\n]*$/gm, "");

  // 8. Título principal da proposta: promover para h1 destacado
  md = md.replace(/^(#{1,2})\s*(PROPOSTA\s+DE\s+(OBRA|SERVI[ÇC]O)[^\n]+)$/gim, (_, __, title) => `# ${title.trim()}`);

  // 9. Limpar linhas em branco excessivas (mais de 2 seguidas → 1)
  md = md.replace(/\n{3,}/g, "\n\n");
  // 10. "Objeto do Contrato" → "Objeto da Proposta" (ainda não é contrato)
  md = md.replace(/OBJETO\s+DO\s+CONTRATO/gi, "OBJETO DA PROPOSTA");
  md = md.replace(/[Oo]bjeto\s+do\s+[Cc]ontrato/g, "Objeto da Proposta");

  let lines = md.split("\n");
  let out = [],
    inList = false,
    listType = "",
    inTable = false;

  function closeList() {
    if (inList) {
      out.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
      listType = "";
    }
  }

  function closeTable() {
    if (inTable) {
      out.push("</table>");
      inTable = false;
    }
  }

  for (let raw of lines) {
    let line = raw;

    // Orientações
    if (line.startsWith("ORIENTACAO:")) {
      closeList();
      closeTable();
      const txt = line.slice(11).trim();
      out.push(`<div class="orientacao">${esc(txt)}<button class="rm-btn" onclick="this.parentElement.remove()" title="Remover esta orientação">✕</button></div>`);
      continue;
    }
    // Headings
    if (/^#{4,} (.+)$/.test(line)) {
      closeList();
      closeTable();
      out.push(`<h3>${inlineFormat(line.replace(/^#+\s*/, ""))}</h3>`);
      continue;
    }
    if (/^### (.+)$/.test(line)) {
      closeList();
      closeTable();
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      continue;
    }
    if (/^## (.+)$/.test(line)) {
      closeList();
      closeTable();
      // Converter caixa alta para Title Case (mantém abreviações como ART, CNPJ, BIM)
      const h2raw = line.slice(3);
      const h2txt = titleCase(h2raw);
      out.push(`<h2>${inlineFormat(h2txt)}</h2>`);
      continue;
    }
    if (/^# (.+)$/.test(line)) {
      closeList();
      closeTable();
      const h1raw = line.slice(2);
      const h1txt = inlineFormat(titleCase(h1raw));
      // Título principal da proposta (linha sem número) recebe classe doc-titulo
      const isMainTitle = !/^\d/.test(h1raw.trim()) || h1raw.includes("—") || h1raw.includes("--");
      out.push(isMainTitle ? `<h1 class="doc-titulo">${h1txt}</h1>` : `<h1>${h1txt}</h1>`);
      continue;
    }
    // Bullets
    if (/^\s*[-•*] (.+)$/.test(line)) {
      closeTable();
      const txt = line.replace(/^\s*[-•*]\s*/, "");
      if (!inList || listType !== "ul") {
        closeList();
        out.push("<ul>");
        inList = true;
        listType = "ul";
      }
      out.push(`<li>${inlineFormat(txt)}</li>`);
      continue;
    }
    // Numbered list
    if (/^\d+\.\s+(.+)$/.test(line)) {
      closeTable();
      const txt = line.replace(/^\d+\.\s+/, "");
      if (!inList || listType !== "ol") {
        closeList();
        out.push("<ol>");
        inList = true;
        listType = "ol";
      }
      out.push(`<li>${inlineFormat(txt)}</li>`);
      continue;
    }
    // Table rows
    if (/^\|.+\|$/.test(line)) {
      closeList();
      if (line.match(/^\|[\s\-|]+\|$/)) continue; // separator row
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      const isHeader = lines.indexOf(raw) > 0 && /^\|[\s\-|]+\|$/.test(lines[lines.indexOf(raw) + 1] || "");
      if (isHeader) {
        closeTable();
        out.push("<table>");
        inTable = true;
        out.push("<tr>" + cells.map((c) => `<th>${inlineFormat(c)}</th>`).join("") + "</tr>");
        continue;
      }
      if (!inTable) {
        out.push("<table>");
        inTable = true;
      }
      out.push("<tr>" + cells.map((c) => `<td>${inlineFormat(c)}</td>`).join("") + "</tr>");
      continue;
    }
    // Empty line
    if (!line.trim()) {
      closeList();
      closeTable();
      out.push("");
      continue;
    }
    // Paragraph
    closeList();
    closeTable();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join("\n");
}

function inlineFormat(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ─── ORIENTAÇÕES ─────────────────────────────────────────────────────────────
function removerTodasOrientacoes() {
  document.querySelectorAll("#doc-content .orientacao").forEach((el) => el.remove());
  showToast("✓ Todas as orientações foram removidas.");
}

// ─── EDITOR ──────────────────────────────────────────────────────────────────
function fmt(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById("doc-content").focus();
}
function fmtBlock(tag) {
  document.execCommand("formatBlock", false, tag);
  document.getElementById("doc-content").focus();
}

// ─── DOWNLOAD DOCX ───────────────────────────────────────────────────────────
function baixarDocx() {
  const btn = document.getElementById("btn-dl-docx");
  btn.disabled = true;
  btn.textContent = "Gerando…";

  // Construir texto limpo do editor (sem orientações se já removidas, senão marca visualmente)
  const docEl = document.getElementById("doc-content");
  const clone = docEl.cloneNode(true);
  // Substituir .orientacao por texto entre colchetes
  clone.querySelectorAll(".orientacao").forEach((el) => {
    const txt = document.createTextNode("[ORIENTAÇÃO — REMOVER ANTES DE ENVIAR: " + el.innerText.replace("✕", "").trim() + "]");
    el.replaceWith(txt);
  });
  const html = clone.innerHTML;

  // Usar a API do Anthropic para gerar DOCX via base64 não está disponível no browser
  // Alternativa: gerar HTML e usar blob para download (compatível com Word via "Salvar como")
  // Gerar Word com CSS correto e logos em tamanho controlado
  const cores2 = getCores();
  // Processar logos: limitar tamanho no Word
  let htmlWord = html;
  // Substituir imagens de logo por versões com tamanho máximo
  // Logos: forçar tamanho via atributos width/height + style
  htmlWord = htmlWord.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes("doc-logo-img") && !attrs.includes("doc-logo-box")) return match;
    const cleanAttrs = attrs
      .replace(/\s*style="[^"]*"/gi, "")
      .replace(/\s*width="[^"]*"/gi, "")
      .replace(/\s*height="[^"]*"/gi, "");
    return `<img${cleanAttrs} width="120" height="40" style="width:120px;height:40px;object-fit:contain;display:block;max-width:120px;max-height:40px">`;
  });

  const htmlDoc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
@page{size:A4;margin:2.5cm 2.5cm 2.5cm 2.5cm}
body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.55;color:#111;width:16cm;margin:0 auto}
h1.doc-titulo{font-size:20pt;font-weight:bold;text-align:center;color:${cores2.secundaria};margin:0 0 4pt;page-break-after:avoid}
.doc-subtitulo-tipo{font-size:11pt;text-align:center;color:#666;margin:0 0 18pt;page-break-after:avoid}
.doc-att{font-size:10pt;padding:8pt 12pt;border-left:3pt solid ${cores2.primaria};margin:0 0 16pt;page-break-inside:avoid}
h2{font-size:10pt;font-weight:bold;text-transform:none;color:${cores2.primaria};margin:16pt 0 6pt;border-bottom:0.5pt solid #ccc;padding-bottom:3pt;page-break-after:avoid}
h3{font-size:10.5pt;font-weight:bold;margin:10pt 0 4pt;page-break-after:avoid}
p{margin:0 0 7pt;orphans:3;widows:3}
table{border-collapse:collapse;width:100%;margin:8pt 0;page-break-inside:avoid}
th{background:#EEF3FF;font-weight:bold;text-align:left;padding:5pt 7pt;border:0.5pt solid #ccc;font-size:10pt}
td{padding:5pt 7pt;border:0.5pt solid #ccc;font-size:10pt;vertical-align:top}
tr:nth-child(even) td{background:#F8F9FE}
ul,ol{margin:4pt 0 8pt;padding-left:16pt}
li{margin-bottom:3pt;font-size:10.5pt}
.doc-logos{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1pt solid #ddd;padding-bottom:10pt;margin-bottom:14pt;page-break-inside:avoid}
.doc-logo-box img{max-height:50pt;max-width:120pt;object-fit:contain}
.doc-rodape{display:flex;gap:30pt;margin-top:24pt;padding-top:12pt;border-top:1pt solid #ccc;page-break-inside:avoid}
.doc-rodape-col{flex:1}
.doc-rodape-col-label{font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5pt;color:${cores2.primaria};margin-bottom:5pt}
.doc-rodape-col table{width:100%;border:none;margin:0}
.doc-rodape-col td{border:none;padding:1.5pt 0;font-size:9.5pt;vertical-align:top}
.doc-rodape-col td:first-child{font-size:8pt;font-weight:bold;text-transform:uppercase;color:#888;width:90pt;padding-right:6pt;white-space:nowrap}
.doc-data-validade{display:flex;gap:24pt;margin-top:10pt;padding-top:8pt;border-top:0.5pt solid #eee;page-break-inside:avoid}
.doc-data-item{display:flex;flex-direction:column;gap:1pt}
.doc-data-label{font-size:7.5pt;font-weight:bold;text-transform:uppercase;color:#999}
.doc-data-valor{font-size:10pt;font-weight:500}
.orientacao{background:#FEF3E8;border-left:3pt solid #E67E22;padding:6pt 10pt;margin:6pt 0;font-size:9.5pt;color:#7a3c00;page-break-inside:avoid}
.orientacao::before{content:"⚠ ORIENTAÇÃO — remover antes de enviar: ";font-weight:bold}
.rodape-doc{border-top:0.5pt solid #ddd;margin-top:14pt;padding-top:8pt;font-size:9pt;color:#888;text-align:center;page-break-inside:avoid}
</style>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
</head><body>${htmlWord}</body></html>`;

  const blob = new Blob([htmlDoc], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Escopo-Proposta-Obra.doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Word (.doc)';
  showToast("✓ Arquivo Word baixado! Abra no Word e salve como .docx se necessário.");
}

// ─── DOWNLOAD PPTX ───────────────────────────────────────────────────────────
function baixarPptx() {
  const btn = document.getElementById("btn-dl-pptx");
  btn.disabled = true;
  btn.textContent = "Gerando…";

  // Carregar PptxGenJS via CDN se ainda não estiver disponível
  function gerarComLib() {
    const docEl = document.getElementById("doc-content");
    // Extrair seções do documento
    const sections = [];
    let current = null;
    docEl.querySelectorAll("h1,h2,h3,p,ul,ol,table,.orientacao").forEach((el) => {
      if (el.tagName === "H1" || el.tagName === "H2") {
        if (current) sections.push(current);
        current = { title: el.innerText.trim(), content: [] };
      } else if (el.tagName === "H3") {
        if (current) current.content.push({ type: "subtitle", text: el.innerText.trim() });
      } else if (el.classList.contains("orientacao")) {
        // skip orientações no PPTX
      } else if (el.tagName === "P") {
        if (current) current.content.push({ type: "text", text: el.innerText.trim() });
      } else if (el.tagName === "UL" || el.tagName === "OL") {
        const items = [...el.querySelectorAll("li")].map((li) => li.innerText.trim());
        if (current && items.length) current.content.push({ type: "list", items });
      } else if (el.tagName === "TABLE") {
        // simplify table to text
        const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.innerText.trim()).join(" | "));
        if (current && rows.length) current.content.push({ type: "table", rows });
      }
    });
    if (current) sections.push(current);

    // Gerar CSV-like PPTX via HTML trick (PowerPoint abre HTML com extensão .pptx apenas em alguns casos)
    // Melhor: gerar um HTML com "presentation" semântica para download
    const d = collectData();
    let slidesHtml = `
  <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;margin:0;padding:0}
  .slide{width:25.4cm;min-height:14.29cm;padding:1.5cm 2cm;page-break-after:always;box-sizing:border-box;background:#fff;border:1px solid #ccc;margin-bottom:20px;position:relative}
  .slide-title{font-size:28pt;font-weight:bold;color:#0A1A5C;margin-bottom:.5cm}
  .slide-cover{background:linear-gradient(135deg,#0A1A5C,#0D2A8A);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:14.29cm}
  .slide-cover .slide-title{color:#fff;font-size:32pt}
  .slide-sub{font-size:14pt;color:#1560F5;margin-bottom:.8cm;font-weight:bold}
  .slide-body{font-size:12pt;line-height:1.6}
  .slide-body li{margin-bottom:4pt}
  .slide-body p{margin-bottom:8pt}
  .slide-num{position:absolute;bottom:.5cm;right:1cm;font-size:10pt;color:#999}
  </style></head><body>`;

    // Capa
    slidesHtml += `<div class="slide slide-cover">
    <div class="slide-title">Escopo de Serviços</div>
    <div style="font-size:16pt;color:rgba(255,255,255,.8);margin-top:.4cm">${esc(d.tipoObra)}</div>
    <div style="font-size:13pt;color:rgba(255,255,255,.6);margin-top:.3cm">${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>`;

    sections.forEach((sec, i) => {
      let body = "";
      for (const c of sec.content.slice(0, 8)) {
        if (c.type === "text" && c.text) body += `<p>${esc(c.text.slice(0, 300))}</p>`;
        else if (c.type === "list")
          body += `<ul>${c.items
            .slice(0, 8)
            .map((it) => `<li>${esc(it)}</li>`)
            .join("")}</ul>`;
        else if (c.type === "subtitle") body += `<p><strong>${esc(c.text)}</strong></p>`;
        else if (c.type === "table")
          body += `<ul>${c.rows
            .slice(0, 6)
            .map((r) => `<li>${esc(r)}</li>`)
            .join("")}</ul>`;
      }
      slidesHtml += `<div class="slide">
      <div class="slide-title">${esc(sec.title)}</div>
      <div class="slide-body">${body || "<p>(conteúdo desta seção)</p>"}</div>
      <div class="slide-num">${i + 2}</div>
    </div>`;
    });

    slidesHtml += "</body></html>";

    // Usar PptxGenJS se disponível
    if (typeof PptxGenJS !== "undefined" || typeof pptxgen !== "undefined") {
      const PG = typeof pptxgen !== "undefined" ? pptxgen : PptxGenJS;
      const pptx = new PG();
      pptx.layout = "LAYOUT_WIDE";
      const cores2 = getCores();

      // Slide de capa
      const slideCapa = pptx.addSlide();
      slideCapa.background = { color: cores2.secundaria.replace("#", "") };
      slideCapa.addText("Proposta de Serviços", {
        x: 1,
        y: 1.5,
        w: 8,
        h: 1.2,
        fontSize: 36,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      if (d.tipoObra) {
        slideCapa.addText(d.tipoObra.toUpperCase(), {
          x: 1,
          y: 2.9,
          w: 8,
          h: 0.6,
          fontSize: 16,
          color: "AACCFF",
          align: "center",
        });
      }
      if (d.dataDocumento) {
        slideCapa.addText(d.dataDocumento, {
          x: 1,
          y: 5.5,
          w: 8,
          h: 0.4,
          fontSize: 12,
          color: "CCDDFF",
          align: "center",
        });
      }

      // Slides de conteúdo
      sections.forEach((sec) => {
        const slide = pptx.addSlide();
        slide.addText(sec.title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.7,
          fontSize: 22,
          bold: true,
          color: cores2.primaria.replace("#", ""),
          border: { type: "none" },
        });
        slide.addShape(pptx.ShapeType.line, {
          x: 0.5,
          y: 1.1,
          w: 9,
          h: 0,
          line: { color: cores2.primaria.replace("#", ""), width: 1 },
        });

        let y = 1.3;
        for (const item of sec.content.slice(0, 6)) {
          if (y > 4.8) break;
          if (item.type === "text" && item.text) {
            const txt = item.text.slice(0, 250);
            slide.addText(txt, { x: 0.5, y, w: 9, h: 0.5, fontSize: 11, color: "333333", wrap: true });
            y += 0.55;
          } else if (item.type === "list") {
            const items = item.items.slice(0, 6).map((t) => ({ text: t.slice(0, 120), options: { bullet: true, fontSize: 10, color: "333333" } }));
            slide.addText(items, { x: 0.6, y, w: 8.8, h: items.length * 0.35, wrap: true });
            y += items.length * 0.35 + 0.1;
          } else if (item.type === "subtitle") {
            slide.addText(item.text, { x: 0.5, y, w: 9, h: 0.35, fontSize: 11, bold: true, color: "222222" });
            y += 0.4;
          } else if (item.type === "table" && item.rows.length) {
            item.rows.slice(0, 4).forEach((row) => {
              slide.addText(row, { x: 0.5, y, w: 9, h: 0.3, fontSize: 9, color: "555555" });
              y += 0.32;
            });
          }
        }
        // Numeração
        slide.addText(String(sections.indexOf(sec) + 2), {
          x: 9.3,
          y: 5.3,
          w: 0.5,
          h: 0.3,
          fontSize: 9,
          color: "AAAAAA",
          align: "right",
        });
      });

      pptx.writeFile({ fileName: "Proposta-de-Obra.pptx" }).then(() => {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> PowerPoint (.pptx)';
        showToast("✓ Arquivo .pptx gerado!");
      });
    } else {
      // Fallback: HTML printável com estrutura de slides (PowerPoint pode importar via "Inserir > Slides de Outline")
      const blob = new Blob([slidesHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Proposta-de-Obra-slides.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> PowerPoint (.pptx)';
      showToast("✓ Slides em HTML baixados — abra no Google Slides ou Canva para editar.");
    }
  }

  // Carregar PptxGenJS se necessário, depois gerar
  if (typeof PptxGenJS === "undefined" && typeof pptxgen === "undefined") {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
    s.onload = gerarComLib;
    s.onerror = gerarComLib; // usa fallback se CDN falhar
    document.head.appendChild(s);
  } else {
    gerarComLib();
  }
}

// ─── SELETOR DE IA + COPIAR E ABRIR ─────────────────────────────────────────
const AI_URLS = {
  gpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app",
};
let selectedAI = null;

function selAI(id, btn) {
  selectedAI = id;
  document.querySelectorAll(".ai-sel-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  // Atualizar hint e destacar botão principal
  const hint = document.getElementById("ai-sel-hint");
  const nomes = { gpt: "ChatGPT", claude: "Claude", gemini: "Gemini" };
  if (hint) hint.textContent = "Pronto! Vai abrir " + (nomes[id] || id) + " em nova aba";
  if (hint) hint.style.color = "var(--green)";
}

function copiarAbrirIA() {
  if (!promptGerado) {
    showToast("Monte o prompt primeiro.");
    return;
  }
  if (!selectedAI) {
    showToast("Selecione uma IA antes de continuar.");
    return;
  }

  // ChatGPT e Gemini aceitam prompt via URL; Claude não suporta
  function abrirIA() {
    if (selectedAI === "claude") {
      // Claude não suporta prompt na URL — copia + abre chat em branco
      window.open("https://claude.ai/new", "_blank");
      showToast("✓ Prompt copiado! Cole com Ctrl+V no Claude.");
    } else if (selectedAI === "gpt") {
      const url = "https://chatgpt.com/?q=" + encodeURIComponent(promptGerado);
      window.open(url, "_blank");
      showToast("✓ Abrindo ChatGPT com o prompt…");
    } else if (selectedAI === "gemini") {
      const url = "https://gemini.google.com/app?q=" + encodeURIComponent(promptGerado);
      window.open(url, "_blank");
      showToast("✓ Abrindo Gemini com o prompt…");
    }
  }

  // Copiar sempre, em paralelo
  navigator.clipboard
    .writeText(promptGerado)
    .then(abrirIA)
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = promptGerado;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      abrirIA();
    });
}


// ─── SALVAR / IMPORTAR ───────────────────────────────────────────────────────
function salvarHTML() {
  const state = {
    version: "6",
    savedAt: new Date().toISOString(),
    elistData: JSON.parse(JSON.stringify(elistData)),
    exclTags: [...exclTags],
    logosData: { ...logosData },
    cores: getCores(),
    corPrimHex: document.getElementById("cor-primaria-hex")?.value || "#1560F5",
    corSecHex: document.getElementById("cor-secundaria-hex")?.value || "#0A1A5C",
    fields: {
      local: document.getElementById("local").value,
      area: document.getElementById("area").value,
      valor: document.getElementById("valor").value,
      "data-inicio": document.getElementById("data-inicio").value,
      objeto: document.getElementById("objeto").value,
      "prazo-num": document.getElementById("prazo-num").value,
      "prazo-unidade": document.getElementById("prazo-unidade").value,
      "prazo-outro": document.getElementById("prazo-outro").value,
      "nome-contratado": document.getElementById("nome-contratado").value,
      "cnpj-contratado": document.getElementById("cnpj-contratado") ? document.getElementById("cnpj-contratado").value : "",
      "email-contratado": document.getElementById("email-contratado") ? document.getElementById("email-contratado").value : "",
      "tel-contratado": document.getElementById("tel-contratado") ? document.getElementById("tel-contratado").value : "",
      "nome-contratante": document.getElementById("nome-contratante").value,
      "rep-contratado": document.getElementById("rep-contratado").value,
      "rep-contratante": document.getElementById("rep-contratante").value,
      "data-documento": document.getElementById("data-documento").value,
      "cidade-documento": document.getElementById("cidade-documento").value,
      "obs-extras": document.getElementById("obs-extras").value,
      "rodape-texto": document.getElementById("rodape-texto") ? document.getElementById("rodape-texto").value : "",
      "validade-num": document.getElementById("validade-num") ? document.getElementById("validade-num").value : "",
      "validade-unidade": document.getElementById("validade-unidade") ? document.getElementById("validade-unidade").value : "dias",
    },
    checkedServicos: [...document.querySelectorAll("#servicos-grid input:checked")].map((c) => c.value),
    promptGerado,
    escopoHTML: document.getElementById("doc-content").innerHTML,
    currentPage,
    currentSection: document.getElementById("section-result").style.display === "block" ? "result" : document.getElementById("section-prompt").style.display === "block" ? "prompt" : "form",
  };

  // Embutir o estado no próprio HTML como um script de dados
  const pageHTML = document.documentElement.outerHTML;
  const stateTag = `\n<script id="of-saved-state" type="application/json">${JSON.stringify(state)}<\/script>`;
  // Inserir antes do </body>
  const finalHTML = pageHTML.replace(/<\/body>/, stateTag + "\n</body>");

  const blob = new Blob([finalHTML], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nome = (state.fields["nome-contratado"] || "proposta")
    .replace(/[^a-zA-Z0-9çãõáéíóúâêôàü ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 40);
  a.download = `of-proposta-${nome}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("✓ Proposta salva em HTML! Importe-a quando quiser continuar.");
}

function importarHTML(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.endsWith(".html")) {
    showToast("Por favor, importe um arquivo .html gerado por esta ferramenta.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      // Extrair o estado do script de dados embutido no HTML
      const html = e.target.result;
      const match = html.match(/<script[^>]*id="of-saved-state"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) throw new Error("Arquivo inválido ou não foi gerado por esta ferramenta.");
      const state = JSON.parse(match[1]);
      if (!state.version) throw new Error("Arquivo inválido.");

      // Restaurar elist data
      Object.assign(elistData, state.elistData || {});
      Object.keys(elistData).forEach((id) => er(id));

      // Restaurar tags de exclusão
      exclTags = state.exclTags || [];
      renderExcl();

      // Restaurar logos
      if (state.logosData) {
        logosData = state.logosData;
        ["contratado", "contratante"].forEach((tipo) => {
          if (logosData[tipo]) {
            document.getElementById("lp-" + tipo).innerHTML = `<img src="${logosData[tipo]}" class="logo-preview" alt="Logo">
               <div style="font-size:11px;color:var(--green);margin-top:5px;font-weight:600">✓ Logo importado</div>
               <div style="font-size:10.5px;color:var(--muted);margin-top:2px;cursor:pointer;text-decoration:underline" onclick="removeLogo('${tipo}')">Remover</div>`;
          }
        });
      }

      // Restaurar campos de texto
      const f = state.fields || {};
      Object.keys(f).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = f[id] || "";
      });

      // Restaurar rodapé
      if (f["rodape-texto"]) {
        const rt = document.getElementById("rodape-texto");
        if (rt) rt.value = f["rodape-texto"];
      }

      // Restaurar checkboxes
      (state.checkedServicos || []).forEach((val) => {
        document.querySelectorAll("#servicos-grid input").forEach((chk) => {
          if (chk.value === val) {
            chk.checked = true;
            chk.closest("label").classList.add("checked");
          }
        });
      });

      // Restaurar prazo outro visibility
      togglePrazoOutro();

      // Restaurar prompt
      promptGerado = state.promptGerado || "";
      if (promptGerado) document.getElementById("prompt-box").textContent = promptGerado;

      // Restaurar seção e conteúdo do editor
      const sec = state.currentSection || "form";
      if (sec === "result" && state.escopoHTML) {
        document.getElementById("section-form").style.display = "none";
        document.getElementById("section-prompt").style.display = "none";
        document.getElementById("section-result").style.display = "block";
        document.getElementById("doc-content").innerHTML = state.escopoHTML;
        document.getElementById("steps-bar").style.display = "flex";
        setStep(5);
      } else if (sec === "prompt") {
        document.getElementById("section-form").style.display = "none";
        document.getElementById("section-result").style.display = "none";
        document.getElementById("section-prompt").style.display = "block";
        document.getElementById("steps-bar").style.display = "flex";
        setStep(4);
      } else {
        // Voltar para o formulário na página certa
        const pg = Math.min(state.currentPage || 1, 3);
        for (let i = 1; i <= 3; i++) document.getElementById("page-" + i).style.display = i === pg ? "block" : "none";
        currentPage = pg;
        setStep(pg);
      }

      showToast("✓ Projeto importado com sucesso!");
    } catch (err) {
      showToast("Erro ao importar: " + err.message);
    }
  };
  reader.readAsText(file);
  input.value = ""; // reset para permitir reimportar o mesmo arquivo
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  // Sync seletores de cor com campos hex
  ["primaria", "secundaria"].forEach((tipo) => {
    document.getElementById("cor-" + tipo).addEventListener("input", () => {
      document.getElementById("cor-" + tipo + "-hex").value = document.getElementById("cor-" + tipo).value;
    });
  });

  // Checkboxes de serviços
  document.getElementById("servicos-grid").innerHTML = SERVICOS_LISTA.map(
    (s, i) => `
    <label class="check-item" id="chk-lbl-${i}" onclick="toggleChk(${i})">
      <input type="checkbox" id="chk-${i}" value="${esc(s)}">
      <div class="check-box"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></div>
      <span class="check-label">${s}</span>
    </label>`,
  ).join("");

  // Sugestões exclusões
  document.getElementById("excl-sugestoes").innerHTML = EXCL_SUGESTOES.map((s) => `<span class="chip" onclick="addExcl('${esc(s)}')">${s}</span>`).join("");

  // Tag input exclusões
  const ei = document.getElementById("excl-input");
  ei.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = ei.value.trim().replace(/,$/, "");
      if (v) addExcl(v);
      ei.value = "";
    }
  });
  ei.addEventListener("blur", () => {
    const v = ei.value.trim();
    if (v) addExcl(v);
    ei.value = "";
  });

  // Enter nos inputs elist
  ["tipo-obra", "regime", "pagamento", "reajuste", "premissas", "servicos-custom"].forEach((id) => {
    const inp = document.getElementById(id + "-input");
    if (inp)
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ea(id);
        }
      });
  });
});
