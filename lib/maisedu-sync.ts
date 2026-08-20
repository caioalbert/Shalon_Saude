import { resolveMaisEduProduct } from "./maisedu-products";

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

/**
 * Função principal de sincronização com a API do parceiro
 */
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
    produto: Number(produtoId), // 1 ou 2
    cep: cepClean,
    rua: cadastro.endereco || cadastro.rua || cadastro.logradouro || "Não informado",
    numero: String(cadastro.numero || "S/N"),
    cidade: cadastro.cidade || "Não informada",
    estado: (cadastro.estado || cadastro.uf || "").toUpperCase().slice(0, 2),
  };

  // Validações antes do envio
  if (!payload.doc || !payload.email) {
    return {
      success: false,
      error: "CPF (doc) e Email são obrigatórios para a sincronização.",
      payloadSent: payload,
    };
  }

  if (typeof payload.produto !== "number" || isNaN(payload.produto) || payload.produto <= 0) {
    return {
      success: false,
      error: `Código de produto inválido (${payload.produto}). Verifique o plano cadastrado.`,
      payloadSent: payload,
    };
  }

  const baseUrl = process.env.MAISEDU_API_URL || "https://api.parceiro.com.br";
  const token = process.env.MAISEDU_API_TOKEN || "";

  try {
    const response = await fetch(`${baseUrl}/api/v1/partner_register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error:
          responseData.message ||
          responseData.error ||
          `Erro HTTP ${response.status} na API do parceiro`,
        status: response.status,
        data: responseData,
        payloadSent: payload,
      };
    }

    return {
      success: true,
      data: responseData,
      status: response.status,
      payloadSent: payload,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha na conexão com o servidor do parceiro.",
      payloadSent: payload,
    };
  }
}

// Exporta também com o alias alternativo para compatibilidade total
export const syncSingleCadastroMaisEdu = syncCadastroToMaisEdu;