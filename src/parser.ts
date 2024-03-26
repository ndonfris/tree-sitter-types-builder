import fs from 'fs'
import { resolve } from 'path';
import Parser from 'web-tree-sitter'

const wasmPath = resolve(__dirname , '..',
  'node_modules',
  '@esdmr',
  'tree-sitter-fish',
  'tree-sitter-fish.wasm')

async function LangString() {
  await Parser.init()
  const wasmFile = await Parser.Language.load(wasmPath)
  return wasmFile
}



const print = async () => {
  const lang = await LangString()
  const nodeTypesArr: string[] = []
  console.log([
    '/**',
    ' * AUTO GENERATED FILE',
    ' */',
  ].join('\n'));
  for (let i = 0; i < lang.nodeTypeCount; i++) {
    const str = lang.nodeTypeForId(i) ?? ''
    const raw = String.raw`${str}`
    const wrappedStr = JSON.stringify(`${raw}`)
    if (nodeTypesArr.includes(wrappedStr)) {
      continue
    }
    nodeTypesArr.push(wrappedStr)
  }
  console.log("export type FishTsNodeType =\n\t" + nodeTypesArr.join(' |\n\t'))
  console.log();
  console.log(`export enum FishTsNodeType {\n`, nodeTypesArr.map((x, i) => `\t${x} = ${i}`).join(',\n'), `\n}`)
  console.log(`export const FishTsNodeTypeSet = new Set<FishTsNodeType>([`, nodeTypesArr.map(x => `${x}`).join(', '), `])`);
  console.log();
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
  console.log();
  console.log("export type FishTsFieldNameType =\n\t", nodeFieldsArr.join(' |\n\t'))
  console.log(`export enum FishTsFieldNameType {\n`, nodeFieldsArr.map((x, i) => `\t${x} = ${i}`).join(',\n'), `\n}`);
  console.log(`export const FishTsFieldNameTypeSet = new Set<FishTsFieldNameType>([`, nodeFieldsArr.map(x => `${x}`).join(', '), `])`);
}
print()
