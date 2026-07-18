#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.name.endsWith(".mjs")) result.push(path);
  }
  return result;
}

async function check(file) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`syntax check failed: ${file}`)));
    child.on("error", reject);
  });
}

for (const directory of [resolve("scripts"), resolve("tests")]) {
  for (const file of await files(directory)) await check(file);
}
