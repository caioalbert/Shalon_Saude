/* eslint-disable jsx-a11y/alt-text */

import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { DEFAULT_TERMO_BODY } from '@/lib/termo-template'

const SIGNATURE_FRAME_WIDTH = 210
const SIGNATURE_FRAME_HEIGHT = 70
const SIGNATURE_BASELINE_RATIO = 0.72
const SIGNATURE_BASELINE_TOP = Math.round(SIGNATURE_FRAME_HEIGHT * SIGNATURE_BASELINE_RATIO)

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontSize: 10,
    lineHeight: 1.35,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  smallGap: {
    marginBottom: 3,
  },
  signatureBlock: {
    marginTop: 14,
    alignItems: 'center',
  },
  signatureFrame: {
    marginTop: 6,
    width: SIGNATURE_FRAME_WIDTH,
    height: SIGNATURE_FRAME_HEIGHT,
    position: 'relative',
  },
  signatureGuideLine: {
    position: 'absolute',
    top: SIGNATURE_BASELINE_TOP,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  signatureInk: {
    position: 'absolute',
    top: SIGNATURE_BASELINE_TOP - 18,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Times-Italic',
    fontSize: 16,
  },
  signatureImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIGNATURE_FRAME_WIDTH,
    height: SIGNATURE_FRAME_HEIGHT,
    objectFit: 'contain',
  },
  signerName: {
    marginTop: 4,
    marginBottom: 2,
  },
})

type CadastroPdfData = {
  nome: string
  cpf: string
  termo_assinado_em?: string | null
  rg?: string | null
  email: string
  telefone?: string | null
  sexo?: string | null
  data_nascimento?: string | null
  estado_civil?: string | null
  nome_conjuge?: string | null
  escolaridade?: string | null
  situacao_profissional?: string | null
  profissao?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
}

type DependentePdfData = {
  nome?: string | null
  relacao?: string | null
  rg?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  email?: string | null
  telefone_celular?: string | null
  sexo?: string | null
}

type TermoAdesaoPDFProps = {
  data: CadastroPdfData
  dependentes: DependentePdfData[]
  termoBodyText?: string
  assinaturaDataUrl?: string
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

function formatAddress(data: CadastroPdfData) {
  const endereco = [data.endereco, data.numero, data.complemento]
    .filter(Boolean)
    .join(', ')

  const localizacao = [data.bairro, data.cidade, data.estado]
    .filter(Boolean)
    .join(' - ')

  return [endereco, localizacao].filter(Boolean).join(' | ')
}

function splitTemplateBlocks(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function isHeadingBlock(block: string) {
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\s]+$/.test(block) && block.length <= 80
}

export function TermoAdesaoPDF({ data, dependentes, termoBodyText, assinaturaDataUrl }: TermoAdesaoPDFProps) {
  const dependentesRows = dependentes.filter((dep) => dep && dep.nome)
  const templateBlocks = splitTemplateBlocks(termoBodyText || DEFAULT_TERMO_BODY)
  const cidadeAssinatura = data.cidade || 'Belo Horizonte'
  const estadoAssinatura = data.estado || 'MG'
  const dataAssinatura = formatDate(data.termo_assinado_em) || new Date().toLocaleDateString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>TERMO DE ADESÃO AO SERVIÇO SHALON SAÚDE</Text>

        <Text style={styles.sectionTitle}>Responsável Financeiro</Text>
        <Text style={styles.row}>Nome: {data.nome || ''}</Text>
        <Text style={styles.row}>Endereço: {formatAddress(data)}</Text>
        <Text style={styles.row}>CEP: {data.cep || ''}</Text>
        <Text style={styles.row}>Email: {data.email || ''}</Text>
        <Text style={styles.row}>CPF: {data.cpf || ''}   RG: {data.rg || ''}</Text>
        <Text style={styles.row}>Telefone: {data.telefone || ''}</Text>
        <Text style={styles.row}>
          Data de Nascimento: {formatDate(data.data_nascimento)}   Sexo: {data.sexo || 'Não informado'}
        </Text>
        <Text style={styles.row}>Estado Civil: {data.estado_civil || ''}</Text>
        {data.nome_conjuge ? (
          <Text style={styles.row}>Nome do Cônjuge: {data.nome_conjuge}</Text>
        ) : null}
        <Text style={styles.row}>Escolaridade: {data.escolaridade || ''}</Text>
        <Text style={styles.row}>
          Situação Profissional: {data.situacao_profissional || ''}   Profissão: {data.profissao || ''}
        </Text>

        <Text style={styles.sectionTitle}>Dados dos Dependentes</Text>
        {dependentesRows.length > 0 ? (
          dependentesRows.map((dep, index) => (
            <View key={`dep-${index}`} style={styles.smallGap}>
              <Text>Nome: {dep.nome || ''}</Text>
              <Text>
                RG: {dep.rg || ''}   CPF: {dep.cpf || ''}   Nascimento: {formatDate(dep.data_nascimento)}   Sexo: {dep.sexo || 'Não informado'}
              </Text>
              <Text>Email: {dep.email || ''}</Text>
              <Text>Celular: {dep.telefone_celular || ''}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.row}>Nenhum dependente cadastrado.</Text>
        )}

        <Text style={styles.paragraph}>
          Pela adesão aos serviços da Shalon Saúde, o(a) CONTRATANTE pagará ao Prestador de Serviços o valor de R$ 19,90 (dezenove reais e noventa centavos), plano individual, sem taxa de adesão.
        </Text>
        <Text style={styles.paragraph}>
          O pagamento pelos serviços contratados será realizado por meio de boleto bancário via e-mail do Responsável Financeiro, com vencimento todo dia 05 (cinco) do mês subsequente ao ato da assinatura deste termo.
        </Text>

        {templateBlocks.map((block, index) => (
          <Text
            key={`template-block-${index}`}
            style={isHeadingBlock(block) ? styles.sectionTitle : styles.paragraph}
          >
            {block}
          </Text>
        ))}

        <View style={styles.signatureBlock}>
          <Text>
            {cidadeAssinatura}/{estadoAssinatura}, {dataAssinatura}
          </Text>
          <View style={styles.signatureFrame}>
            {assinaturaDataUrl ? (
              <Image src={assinaturaDataUrl} style={styles.signatureImage} />
            ) : (
              <Text style={styles.signatureInk}>{data.nome || ''}</Text>
            )}
            <View style={styles.signatureGuideLine} />
          </View>
          <Text style={styles.signerName}>{data.nome || 'CONTRATANTE'}</Text>
          <Text>CONTRATANTE</Text>
        </View>
      </Page>
    </Document>
  )
}
