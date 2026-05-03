import fs from "node:fs";

class Reader {
  readText(filePath) {
    throw new Error("readText must be implemented");
  }
}

class FileReader extends Reader {
  readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
  }
}

class Utils extends FileReader {
  static create() {
    return new Utils();
  }

  summary(filePath) {
    const text = this.readText(filePath);
    return { bytes: text.length, head: text.slice(0, 80) };
  }
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

export { FileReader, Reader, Utils, normalize };
