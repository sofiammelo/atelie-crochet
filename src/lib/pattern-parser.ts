export type Material = {
  name: string
  items: string[]
}

export type PatternPart = {
  name: string
  lines: string[]
}

export type ParsedPattern = {
  materials: Material[]
  parts: PatternPart[]
  allLines: string[]
}

const PART_KEYWORDS = [
  'cabeca', 'cabeça', 'corpo', 'bracos', 'braços', 'pernas',
  'orelhas', 'antenas', 'asas', 'pés', 'pes', 'cauda', 'rabo',
  'focinho', 'bico', 'chapeu', 'chapéu', 'roupa', 'vestido',
  'cachecol', 'gola', 'pEscopo', 'pescoco', 'pescoço',
  'tronco', 'barriga', 'costas', 'pata', 'patas',
  'dedos', 'unhas', 'dentes', 'chifres',
]

const MATERIAL_KEYWORDS = [
  'material', 'materiais', 'la', 'lã', 'las', 'lãs', 'agulha', 'agulhas',
  'tesoura', 'agulha de tapeceiro', 'marcador', 'enchimento', 'fibra',
  'olhos', 'seguranca', 'botao', 'botões', 'botoes',
  'cera', 'linha', 'fio', 'fios',
]

export function parseCrochetPattern(text: string): ParsedPattern {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const materials: Material[] = []
  const parts: PatternPart[] = []

  let currentMaterial: Material | null = null
  let currentPart: PatternPart | null = null
  let inMaterialsSection = false
  let inPartsSection = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect material sections
    const isMaterialHeader = MATERIAL_KEYWORDS.some(k => {
      const regex = new RegExp(`^\\s*${k}[\\s\\:\\-]`, 'i')
      return regex.test(lower) || lower === k
    })

    if (isMaterialHeader) {
      inMaterialsSection = true
      inPartsSection = false
      currentMaterial = { name: line.replace(/[:]\s*$/, ''), items: [] }
      materials.push(currentMaterial)
      continue
    }

    // Detect part headers (cabeça, corpo, etc.)
    const isPartHeader = PART_KEYWORDS.some(k => {
      const regex = new RegExp(`^\\s*${k}[\\s\\:\\-\\d]`, 'i')
      return regex.test(lower) || lower === k
    })

    if (inMaterialsSection && currentMaterial && (isPartHeader || /^\d+/.test(lower))) {
      inMaterialsSection = false
      inPartsSection = true
    }

    if (isPartHeader && !inMaterialsSection) {
      inPartsSection = true
      currentPart = { name: line.replace(/[:]\s*$/, ''), lines: [] }
      parts.push(currentPart)
      continue
    }

    // If still in materials section, add to current material
    if (inMaterialsSection && currentMaterial) {
      if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        currentMaterial.items.push(line.replace(/^[-•*]\s*/, ''))
      } else if (/^[a-zA-ZÀ-ÿ]/.test(line)) {
        // Check if this looks like a material item (not a header)
        if (line.length < 80 && !/\d+[^\d]/.test(line.substring(0, 3))) {
          currentMaterial.items.push(line)
        } else {
          inMaterialsSection = false
          inPartsSection = true
        }
      }
      continue
    }

    // Otherwise add to current part or create a default part
    if (!inMaterialsSection) {
      if (currentPart) {
        currentPart.lines.push(line)
      } else {
        // Create a default "Receita" part
        currentPart = { name: 'Receita', lines: [line] }
        parts.push(currentPart)
      }
    }
  }

  // Merge consecutive single-line parts? No, keep as is.

  // If no parts were detected but there are lines, create a default part
  if (parts.length === 0 && lines.length > 0) {
    // Filter out material lines
    const materialLines = new Set<string>()
    for (const m of materials) {
      materialLines.add(m.name)
      for (const item of m.items) {
        materialLines.add(item)
      }
    }
    const patternLines = lines.filter(l => !materialLines.has(l))
    if (patternLines.length > 0) {
      parts.push({ name: 'Receita', lines: patternLines })
    }
  }

  return {
    materials,
    parts,
    allLines: lines,
  }
}

export function parseLineByLine(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
}
