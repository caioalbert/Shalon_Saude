export interface Cadastro {
  id: string
  email: string
  nome: string
  cpf: string
  data_nascimento: string
  telefone?: string
  sexo?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  tem_dependentes: boolean
  selfie_path?: string
  termo_pdf_path?: string
  termo_assinado_em?: string
  ip_assinante?: string
  email_enviado_em?: string
  created_at: string
  updated_at: string
}

export interface Dependente {
  id: string
  cadastro_id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  relacao: string
  telefone_celular?: string
  sexo?: string
  created_at: string
}

export interface CadastroFormData {
  // Dados pessoais
  nome: string
  cpf: string
  data_nascimento: string
  telefone: string
  sexo: string
  
  // Endereço
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  
  // Dependentes
  tem_dependentes: boolean
  dependentes: DependenteFormData[]
  
  // Selfie
  selfie_blob?: Blob
  
  // Email para contato
  email: string
}

export interface DependenteFormData {
  nome: string
  cpf: string
  data_nascimento: string
  relacao: string
  telefone_celular: string
  sexo: string
}

export interface TermoAssinado {
  id: string
  cadastro_id: string
  termo_assinado_em: string
  ip_assinante: string
  email_enviado_em: string | null
  termo_pdf_path: string
}
