import fs from 'fs'
// import fs from 'fs'
import path, { resolve } from 'path';
import Parser from 'web-tree-sitter'
import { Command } from 'commander';

// const wasmPath = resolve(__dirname , '..',
//   'node_modules',
//   '@esdmr',
//   'tree-sitter-fish',
//   'tree-sitter-fish.wasm')

async function LangString(wasmPath: string) {
  await Parser.init()
  const wasmFile = await Parser.Language.load(wasmPath)
  return wasmFile
}


// check if filepath exists
const WasmExists = (wasmPath: string) => {
  try {
    if (fs.existsSync(wasmPath)) {
      return true
    }
  } catch(err) {
    console.error(err)
  }
  return false
}

const IsWasm = async (wasmPath: string) => {
  try {
    const wasmFile = await Parser.Language.load(wasmPath)
    return wasmFile !== null ? true : false
  } catch(err) {
    console.error("Error loading wasm file", err)
    return false
  }
}

const LangFromWasm = (wasmPath: string) => {
  if (!wasmPath.endsWith('.wasm')) {
    console.log("Invalid wasm name from file");
    return ''
  }
  const lang = wasmPath.split('.wasm')[0]
  return lang.split('-').pop() ?? ''
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
    output: (str: string) => console.log(str),
    generate: OutputOptionsSet
  }
  const { wasm, lang, output, generate } = obj

  if (!wasm) return {err: true, defaults}

  defaults.lang = lang ? lang : LangFromWasm(wasm)
  if (!defaults.lang) {
    console.log("Invalid lang name")
    return {err: true, defaults}
  }

  if (output) {
    defaults.output = (str: string) => fs.writeFileSync(output, str+'\n')
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
  const setStr = joinString(langName,  special, 'TypeSet')
  const mapStr = joinString(langName,  special, 'TypeMap')
  return { typeStr, enumStr, setStr, mapStr }
}

const print = async (langName: string, wasmPath: string, outputFn: (_: string) => void, withTypes: OutputTypesObj) => {
  const lang = await LangString(wasmPath)
  const nodeTypesArr: string[] = []
  const outArr: string[] = [
    '/**',
    ' * AUTO GENERATED FILE',
    ' */',
  ]

  function addNodeTypes() {
    for (let i = 0; i < lang.nodeTypeCount; i++) {
      const str = lang.nodeTypeForId(i) ?? ''
      const raw = String.raw`${str}`
      const wrappedStr = JSON.stringify(`${raw}`)
      if (nodeTypesArr.includes(wrappedStr)) {
        continue
      }
      nodeTypesArr.push(wrappedStr)
    }
    // outputFn(`export type FishTsNodeType =\n\t${nodeTypesArr.join(' |\n\t')}`)
    // outputFn('');
    // outputFn(`export enum FishTsNodeType {\n ${nodeTypesArr.map((x, i) => `\t${x} = ${i}`).join(',\n')} \n}`)
    // outputFn(`export const FishTsNodeTypeSet = new Set<FishTsNodeType>([ ${nodeTypesArr.map(x => `${x}`).join(', ')} ])`);
    // outputFn('');

    let { typeStr, enumStr, setStr, mapStr } = buildNames(langName, 'Node')
    if (withTypes.Type) outArr.push(`export type ${typeStr} =\n\t${nodeTypesArr.join(' |\n\t')}`)
    if (withTypes.Enum) outArr.push(`export enum ${enumStr} {\n ${nodeTypesArr.map((x, i) => `\t${x} = ${i}`).join(',\n')} \n}`)
    if (withTypes.Set)  outArr.push(`export const ${setStr} = new Set<${typeStr}>([ ${nodeTypesArr.map(x => `${x}`).join(', ')} ])`)
    if (withTypes.Map)  outArr.push(`export const ${mapStr} = new Map<${typeStr}, number>([ ${nodeTypesArr.map((x, i) => `[${x}, ${i}]`).join(', ')} ])`)

  }

  function addFieldTypes() {
    const nodeFieldsArr: string[] = []
    for (let i = 0 ; i < lang.fieldCount; i++) {
      const str = lang.fieldNameForId(i) ?? 'null'
      const raw = String.raw`${str}`
      const wrappedStr = JSON.stringify(`${raw}`)
      if (nodeFieldsArr.includes(wrappedStr)) {
        continue
      }
      nodeFieldsArr.push(wrappedStr)
    }
    // outputFn(`export type FishTsFieldNameType =\n\t${ nodeFieldsArr.join(' |\n\t')}`)
    // outputFn('');
    // outputFn(`export enum FishTsFieldNameType {\n${ nodeFieldsArr.map((x, i) => `\t${x} = ${i}`).join(',\n')} \n}`);
    // outputFn(`export const FishTsFieldNameTypeSet = new Set<FishTsFieldNameType>([${nodeFieldsArr.map(x => `${x}`).join(', ') }])`);
    let { typeStr, enumStr, setStr, mapStr } = buildNames(langName, 'FieldName')
    if (withTypes.Type) outArr.push(`export type ${typeStr} =\n\t${ nodeFieldsArr.join(' |\n\t')}`)
    if (withTypes.Enum) outArr.push(`export enum ${enumStr} {\n${ nodeFieldsArr.map((x, i) => `\t${x} = ${i}`).join(',\n')} \n}`);
    if (withTypes.Set) outArr.push(`export const ${setStr} = new Set<${typeStr}>([${nodeFieldsArr.map(x => `${x}`).join(', ') }])`);
    if (withTypes.Map) outArr.push(`export const ${mapStr} = new Map<${typeStr}, number>([${nodeFieldsArr.map((x, i) => `[${x}, ${i}]`).join(', ') }])`);
  }

  addNodeTypes()
  addFieldTypes()

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
