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
 * Realiza uma requisição POST JSON forçando estritamente a conexão por IPv4 (family: 4)
 */
async function postJsonIPv4(
  urlStr: string,
  headers: Record<string, string>,
  body: any
): Promise<{ status: number; data: any; ok: boolean }> {
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
      family: 4, // <-- FORÇA ESTRITAMENTE IPV4
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

export interface MaisEduSyncResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
  payloadSent?: MaisEduRegisterPayload;
}

export async function syncCadastroToMaisEdu(cadastro: any): Promise<MaisEduSyncResult> {
  const produtoId = resolveMaisEduProduct(cadastro);

  const docClean = (cadastro.cpf || cadastro.doc || "").replace(/\D/g, "");
  const telefoneClean = (cadastro.telefone || cadastro.celular || "").replace(/\D/g, "");
  const cepClean = (cadastro.cep || "").trim();
  const nascimentoFormatted = formatNascimento(cadastro.data_nascimento || cadastro.nascimento);
  const emailClean = (cadastro.email || "").trim().toLowerCase();
  const nomeClean = (cadastro.nome || cadastro.nome_completo || "").trim();
  const loginClean = cadastro.login || generateLogin(emailClean, docClean, nomeClean);

  const payload: MaisEduRegisterPayload = {
    nome: nomeClean,
    email: emailClean,
    login: loginClean,
    doc: docClean,
    telefone: telefoneClean,
    nascimento: nascimentoFormatted,
    produto: Number(produtoId), // 1 (Individual) ou 2 (Familiar)
    cep: cepClean,
    rua: cadastro.endereco || cadastro.rua || cadastro.logradouro || "Não informado",
    numero: String(cadastro.numero || "S/N"),
    cidade: cadastro.cidade || "Não informada",
    estado: (cadastro.estado || cadastro.uf || "").toUpperCase().slice(0, 2),
  };

  // 1. Validação dos dados do beneficiário
  if (!payload.doc || !payload.email) {
    return {
      success: false,
      error: "CPF (doc) e Email são obrigatórios.",
      payloadSent: payload,
    };
  }

  // 2. Leitura das variáveis de ambiente
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

  try {
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = token.toLowerCase().startsWith("bearer ")
        ? token
        : `Bearer ${token}`;
    }

    // Executa a requisição forçando IPv4
    const res = await postJsonIPv4(endpoint, headers, payload);

    if (!res.ok) {
      return {
        success: false,
        error:
          res.data?.message ||
          res.data?.error ||
          res.data?.raw ||
          `Erro HTTP ${res.status} na API do parceiro`,
        status: res.status,
        data: res.data,
        payloadSent: payload,
      };
    }

    return {
      success: true,
      data: res.data,
      status: res.status,
      payloadSent: payload,
    };
  } catch (err: any) {
    console.error(`[sync-grupomais-ipv4] Erro ao conectar em ${endpoint}:`, err);

    return {
      success: false,
      error: `Falha de conexão com ${endpoint}: ${err.message}`,
      payloadSent: payload,
    };
  }
}

export const syncSingleCadastroMaisEdu = syncCadastroToMaisEdu;