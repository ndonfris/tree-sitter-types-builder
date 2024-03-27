import fs from 'fs'
import { resolve } from 'path';
import Parser from 'web-tree-sitter'
import { Command } from 'commander';

async function LangString(wasmPath: string) {
  await Parser.init()
  const wasmFile = await Parser.Language.load(wasmPath)
  return wasmFile
}

function langFormatString(lang: string) {
  return lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase()
}



const LangFromWasm = (wasmPath: string) => {
  if (!wasmPath.endsWith('.wasm')) {
    console.log("Invalid wasm name from file");
    return ''
  }
  const lang = wasmPath.split('.wasm')[0]
  return langFormatString(lang.split('-').pop() ?? '')
}



  
type OutputTypes = 'Type' | 'Enum' | 'Set' | 'Map'
type OutputTypesObj = {[key in OutputTypes]: boolean}
const OutputOptionsSet: OutputTypesObj  = {
  Type: true,
  Enum: true,
  Set: true,
  Map: false 
}

const ClearGenerateOptionsObj = (obj: OutputTypesObj) => {
  for (const key in obj) {
    obj[key as OutputTypes] = false
  }
  return obj
}


const SetGenerateOptionsObj = (obj: OutputTypesObj, ...generate: string[]) => {
  if (!generate.length) obj = ClearGenerateOptionsObj(obj)
  generate.forEach((opt) => {
    if (OutputOptionsSet[opt as OutputTypes]) {
      obj[opt as OutputTypes] = true
    }
  })
  return obj
}

type RunOptions = {
 'wasm': string,
  'lang': string,
  'output': (str: string) => void,
  'generate': OutputTypesObj
}

type ProgramOptions = {
  'wasm'?: string,
  'lang'?: string,
  'output'?: string,
  'generate'?: string
}

function SetupDefaultsFromOptions(obj: ProgramOptions):  {
  err: boolean,
  defaults: RunOptions
} {
  const defaults = {
    wasm: obj.wasm ? obj.wasm : resolve('__dirname'),
    lang: '',
    output: (str: string = '') => console.log(str),
    generate: OutputOptionsSet
  }
  const { wasm, lang, output, generate } = obj

  if (!wasm) return {err: true, defaults}

  defaults.lang = lang ? langFormatString(lang) : LangFromWasm(wasm)
  if (!defaults.lang) {
    console.log("Invalid lang name")
    return {err: true, defaults}
  }

  if (output) {
    defaults.output = (str: string = '') => fs.writeFileSync(output, str+'\n')
  }

  if (generate) {
    defaults.generate = SetGenerateOptionsObj(ClearGenerateOptionsObj(OutputOptionsSet), ...generate.split(','))
  }

  return {err: false, defaults}
}

function buildNames(langName: string, special: 'Node' | 'FieldName' ) {
  const joinString = (...arr: string[]) => arr.filter(x => x).join('')
  const typeStr = joinString(langName, special, 'Type')
  const enumStr = joinString(langName, special, 'Type')
  const mapStr = joinString(langName,  special, 'TypeMap')
  return { typeStr, enumStr, mapStr }
}

const print = async (langName: string, wasmPath: string, outputFn: (_: string) => void, withTypes: OutputTypesObj) => {
  const lang = await LangString(wasmPath)
  const [nodeTypesArr, nodeFieldsArr]: [string[], string[]] = [[], []]
  const outArr: string[] = [
    '/**',
    ' * AUTO GENERATED FILE',
    ' *     tree-sitter-types-builder',
    ' */',
  ]

  function addToArray(arr: string[], maxLen: number, fn: (i: number) => string) {
    for (let i = 0; i < maxLen; i++) {
      const str = fn(i)
      const raw = String.raw`${str}`
      const wrappedStr = JSON.stringify(`${raw}`)
      if (arr.includes(wrappedStr)) continue
      arr.push(wrappedStr)
    }
    return arr
  }


  function addToOutput( type: 'Node' | 'FieldName', typeArr: string[],) {
    let { typeStr, enumStr, mapStr } = buildNames(langName, type)
    if (withTypes.Type) outArr.push(`export type ${typeStr} =\n\t${typeArr.join(' |\n\t')}`)
    if (withTypes.Enum) {
      outArr.push(`\nexport namespace ${typeStr} {\n\t`)
      outArr.push(`  export enum Keys {\n ${typeArr.map((x, i) => `\t${x} = ${i}`).join(',\n')} \n   }`)
      outArr.push(`  export function getKeys(): ${enumStr}[] {\n\t return Object.keys(${enumStr}).map(x => ${enumStr}[x]) as ${enumStr}[]\n   }`)
      outArr.push(`  export function hasKeys(...keys: ${enumStr}[]){\n\t `)
      outArr.push(`      const allKeys = getKeys()\n`)
      outArr.push(`      return keys.every(k => allKeys.includes(k))`)
      outArr.push(`  }`)
      outArr.push(`}`)
    }
    if (withTypes.Map)  outArr.push(`export const ${mapStr} = new Map<${typeStr}, number>([ ${typeArr.map((x, i) => `[${x}, ${i}]`).join(', ')} ])`)
  }

  addToArray(nodeTypesArr, lang.nodeTypeCount, i => lang.nodeTypeForId(i) ?? '')
  addToArray(nodeFieldsArr, lang.fieldCount, i => lang.fieldNameForId(i) ?? 'null')

  addToOutput('Node', nodeTypesArr)
  addToOutput('FieldName', nodeFieldsArr)

  outputFn(outArr.join('\n'))
}





const binary = new Command()
  .option('-o, --output <output>', 'output file to write to')
  .option('-w, --wasm <wasm>', 'wasm file to read from')
  .option('-l, --lang <lang>', 'language name to prefix the generated types')
  .option('--generate <...include>', 'generate Type, Enum, Set')
  .action(options => {
    const {wasm, output, lang, generate} = options
    const {err, defaults } = SetupDefaultsFromOptions({wasm, output, lang, generate})
    if (err) {
      process.exit(1)
    }
    const { lang: langName, wasm: wasmPath, output: outputFile, generate: withTypes } = defaults
    print(langName, wasmPath, outputFile, withTypes)
  })


binary.parse(process.argv)
