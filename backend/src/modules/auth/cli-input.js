import { createInterface } from 'node:readline';

export function question(prompt) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    readline.question(prompt, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

export function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command from an interactive terminal.');
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    let value = '';
    output.write(prompt);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();

    const cleanup = () => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      output.write('\n');
    };
    const onData = (character) => {
      if (character === '\u0003') {
        cleanup();
        reject(new Error('Operation cancelled.'));
      } else if (character === '\r' || character === '\n') {
        cleanup();
        resolve(value);
      } else if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    };

    input.on('data', onData);
  });
}
