import shellEscape from 'shell-escape'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)


// const command = shellEscape(['fish','-P', '-c', 'complete -c echo -'])

async function runCmd(...args: string[]) {
  const command = `\'complete --do-complete=${args.join('\\ ')}\'`
  const fullComplete = `fish -c ${command}`
  console.log({command, fullComplete});
  const out = await execAsync(fullComplete)
  if (out.stderr) {
    console.error(out.stderr)
  }
  console.log(out.stdout)

}

runCmd('echo', '-')


