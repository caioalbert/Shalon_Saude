import dns from "node:dns";
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import { resolveMaisEduProduct } from "./maisedu-products";

// Força a resolução DNS a priorizar IPv4 no processo Node.js
try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch {}

/**
 * Realiza uma requisição POST JSON forçando conexão por IPv4
 */
async function postJsonIPv4(
  urlStr: string,
  headers: Record<string, string>,
  body: any
): Promise<{ status: number; data: any; ok: boolean; rawText: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = JSON.stringify(body);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const reqHeaders: Record<string, string | number> = {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Length": Buffer.byteLength(postData),
    };

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: reqHeaders,
      family: 4, // Força IPv4
      timeout: 20000,
    };

    const req = client.request(options, (res) => {
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        let parsedData: any = {};
        try {
          parsedData = JSON.parse(rawData);
        } catch {
          parsedData = { raw: rawData };
        }

        const statusCode = res.statusCode || 500;
        resolve({
          status: statusCode,
          ok: statusCode >= 200 && statusCode < 300,
          data: parsedData,
          rawText: rawData,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy(new Error("Timeout ao conectar com a API do parceiro"));
    });

    req.write(postData);
    req.end();
  });
}

function formatNascimento(dateString?: string): string {
  if (!dateString) return "";
  const cleaned = String(dateString).trim();

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split("/");
    return `${y}-${m}-${d}`;
  }

  // ISO string
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {}

  return cleaned;
}

function generateLogin(email?: string, cpfClean?: string, nome?: string): string {
  if (email && email.includes("@")) {
    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (username.length >= 3) return username;
  }

  if (cpfClean && cpfClean.length >= 6) {
    return `user${cpfClean.slice(0, 8)}`;
  }

  if (nome) {
    const cleanName = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName.length >= 3) return cleanName.slice(0, 20);
  }

  return `user_${Date.now()}`;
}

export interface MaisEduRegisterPayload {
  nome: string;
  email: string;
  login: string;
  doc: string;
  telefone: string;
  nascimento: string;
  produto: number;
  cep: string;
  rua: string;
  numero: string;
  cidade: string;
  estado: string;
}

export interface BeneficiarySyncResult {
  tipo: "titular" | "dependente";
  nome: string;
  doc: string;
  sucesso: boolean;
  statusHttp?: number;
  resposta?: any;
  erro?: string;
  payloadSent: MaisEduRegisterPayload;
}

export interface MaisEduSyncResult {
  success: boolean;
  data?: {
    titular: BeneficiarySyncResult;
    dependentes: BeneficiarySyncResult[];
    totalVidas: number;
    totalSucesso: number;
    totalFalhas: number;
  };
  error?: string;
  status?: number;
  endpoint?: string;
  timestamp?: string;
  payloadSent?: {
    titular: MaisEduRegisterPayload;
    dependentes: MaisEduRegisterPayload[];
  };
}

/**
 * Monta o payload de um beneficiário individual (titular ou dependente)
 */
function buildBeneficiaryPayload(
  person: any,
  produtoId: number,
  titularContext: {
    email: string;
    telefone: string;
    cep: string;
    rua: string;
    numero: string;
    cidade: string;
    estado: string;
  },
  isTitular = false
): MaisEduRegisterPayload {
  const docClean = (person.cpf || person.doc || "").replace(/\D/g, "");
  const telClean = (person.telefone || person.celular || titularContext.telefone || "").replace(/\D/g, "");
  const nascimentoFormatted = formatNascimento(person.data_nascimento || person.nascimento);
  const nomeClean = (person.nome || person.nome_completo || "").trim();

  // Email: se o dependente tiver email próprio usa ele; caso contrário, gera alias com titular
  let emailClean = (person.email || "").trim().toLowerCase();
  if (!emailClean) {
    if (isTitular) {
      emailClean = titularContext.email;
    } else if (titularContext.email && titularContext.email.includes("@")) {
      // Cria um alias único para evitar conflito de email duplicado no parceiro
      const [user, domain] = titularContext.email.split("@");
      emailClean = `${user}+dep${docClean.slice(-4) || Date.now().toString().slice(-4)}@${domain}`;
    } else {
      emailClean = titularContext.email;
    }
  }

  const loginClean = person.login || generateLogin(emailClean, docClean, nomeClean);

  return {
    nome: nomeClean,
    email: emailClean,
    login: loginClean,
    doc: docClean,
    telefone: telClean,
    nascimento: nascimentoFormatted,
    produto: Number(produtoId),
    cep: titularContext.cep,
    rua: titularContext.rua,
    numero: titularContext.numero,
    cidade: titularContext.cidade,
    estado: titularContext.estado,
  };
}

/**
 * Função principal: Sincroniza o Titular e todos os seus Dependentes sequencialmente
 */
export async function syncCadastroToMaisEdu(cadastro: any): Promise<MaisEduSyncResult> {
  const produtoId = resolveMaisEduProduct(cadastro);
  const timestamp = new Date().toISOString();

  // 1. Dados base de endereço e contato do titular
  const titularContext = {
    email: (cadastro.email || "").trim().toLowerCase(),
    telefone: (cadastro.telefone || cadastro.celular || "").replace(/\D/g, ""),
    cep: (cadastro.cep || "").trim(),
    rua: cadastro.endereco || cadastro.rua || cadastro.logradouro || "Não informado",
    numero: String(cadastro.numero || "S/N"),
    cidade: cadastro.cidade || "Não informada",
    estado: (cadastro.estado || cadastro.uf || "").toUpperCase().slice(0, 2),
  };

  // 2. Extrai a lista de dependentes (trata se vier como array ou string JSON)
  let dependentesList: any[] = [];
  if (Array.isArray(cadastro.dependentes)) {
    dependentesList = cadastro.dependentes;
  } else if (typeof cadastro.dependentes === "string" && cadastro.dependentes.trim()) {
    try {
      const parsed = JSON.parse(cadastro.dependentes);
      if (Array.isArray(parsed)) dependentesList = parsed;
    } catch {}
  }

  // Configuração da URL da API e Token
  const rawBaseUrl =
    process.env.GRUPOMAIS_API_URL ||
    process.env.MAISEDU_API_URL ||
    process.env.MAISEDU_BASE_URL ||
    "https://vo.grupomais.net.br";

  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/api/v1")
    ? `${baseUrl}/partner_register`
    : `${baseUrl}/api/v1/partner_register`;

  const rawToken =
    process.env.GRUPOMAIS_API_TOKEN ||
    process.env.MAISEDU_API_TOKEN ||
    process.env.MAISEDU_TOKEN ||
    "";

  const token = rawToken.trim();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = token.toLowerCase().startsWith("bearer ")
      ? token
      : `Bearer ${token}`;
  }

  // 3. ENVIO DO TITULAR
  const titularPayload = buildBeneficiaryPayload(cadastro, produtoId, titularContext, true);

  console.log("\n==================== [1/N SYNC - ENVIANDO TITULAR] ====================");
  console.log(`Endpoint: POST ${endpoint}`);
  console.log(JSON.stringify(titularPayload, null, 2));

  let titularResult: BeneficiarySyncResult;
  try {
    const resTitular = await postJsonIPv4(endpoint, headers, titularPayload);
    console.log(`Status HTTP: ${resTitular.status}`);
    console.log("Resposta Titular:", JSON.stringify(resTitular.data, null, 2));

    titularResult = {
      tipo: "titular",
      nome: titularPayload.nome,
      doc: titularPayload.doc,
      sucesso: resTitular.ok,
      statusHttp: resTitular.status,
      resposta: resTitular.data,
      erro: resTitular.ok ? undefined : resTitular.data?.message || resTitular.data?.error || `Erro HTTP ${resTitular.status}`,
      payloadSent: titularPayload,
    };
  } catch (err: any) {
    titularResult = {
      tipo: "titular",
      nome: titularPayload.nome,
      doc: titularPayload.doc,
      sucesso: false,
      erro: err.message || "Erro de conexão ao enviar titular",
      payloadSent: titularPayload,
    };
  }

  // 4. LOOP PARA ENVIO DOS DEPENDENTES
  const dependentesResults: BeneficiarySyncResult[] = [];
  const dependentesPayloads: MaisEduRegisterPayload[] = [];

  for (let i = 0; i < dependentesList.length; i++) {
    const dep = dependentesList[i];
    if (!dep || (!dep.nome && !dep.cpf)) continue;

    const depPayload = buildBeneficiaryPayload(dep, produtoId, titularContext, false);
    dependentesPayloads.push(depPayload);

    console.log(`\n==================== [${i + 2}/N SYNC - DEPENDENTE: ${depPayload.nome}] ====================`);
    console.log(JSON.stringify(depPayload, null, 2));

    try {
      const resDep = await postJsonIPv4(endpoint, headers, depPayload);
      console.log(`Status HTTP: ${resDep.status}`);
      console.log(`Resposta Dependente (${depPayload.nome}):`, JSON.stringify(resDep.data, null, 2));

      dependentesResults.push({
        tipo: "dependente",
        nome: depPayload.nome,
        doc: depPayload.doc,
        sucesso: resDep.ok,
        statusHttp: resDep.status,
        resposta: resDep.data,
        erro: resDep.ok ? undefined : resDep.data?.message || resDep.data?.error || `Erro HTTP ${resDep.status}`,
        payloadSent: depPayload,
      });
    } catch (err: any) {
      dependentesResults.push({
        tipo: "dependente",
        nome: depPayload.nome,
        doc: depPayload.doc,
        sucesso: false,
        erro: err.message || `Erro de conexão ao enviar dependente ${depPayload.nome}`,
        payloadSent: depPayload,
      });
    }
  }

  // 5. CONSOLIDAÇÃO DOS RESULTADOS
  const totalVidas = 1 + dependentesResults.length;
  const totalSucesso = (titularResult.sucesso ? 1 : 0) + dependentesResults.filter((d) => d.sucesso).length;
  const totalFalhas = totalVidas - totalSucesso;

  const allSuccess = titularResult.sucesso && dependentesResults.every((d) => d.sucesso);

  return {
    success: titularResult.sucesso, // Sucesso do titular é a base
    data: {
      titular: titularResult,
      dependentes: dependentesResults,
      totalVidas,
      totalSucesso,
      totalFalhas,
    },
    error: allSuccess
      ? undefined
      : `Sincronização concluída com avisos: ${totalSucesso} de ${totalVidas} vidas cadastradas.`,
    endpoint,
    timestamp,
    payloadSent: {
      titular: titularPayload,
      dependentes: dependentesPayloads,
    },
  };
}

export const syncSingleCadastroMaisEdu = syncCadastroToMaisEdu;