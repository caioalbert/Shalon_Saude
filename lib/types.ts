export interface Cadastro {
  id: string
  email: string
  nome: string
  cpf: string
  rg?: string
  data_nascimento: string
  telefone?: string
  sexo?: string
  estado_civil?: string
  nome_conjuge?: string
  escolaridade?: string
  situacao_profissional?: string
  profissao?: string
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
  email_enviado_em?: string
  dependentes_sem_rg_count?: number
  dependentes_sem_email_count?: number
  created_at: string
  updated_at: string
}

export interface Dependente {
  id: string
  cadastro_id: string
  nome: string
  rg?: string
  cpf?: string
  data_nascimento?: string
  relacao: string
  email: string
  telefone_celular?: string
  sexo?: string
  created_at: string
}

export interface CadastroFormData {
  // Dados pessoais
  nome: string
  cpf: string
  rg: string
  data_nascimento: string
  telefone: string
  sexo: string
  estado_civil: string
  nome_conjuge: string
  escolaridade: string
  situacao_profissional: string
  profissao: string
  
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
  rg: string
  cpf: string
  data_nascimento: string
  relacao: string
  email: string
  telefone_celular: string
  sexo: string
}
