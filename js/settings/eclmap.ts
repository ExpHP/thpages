export interface Eclmap {
  ins: Map<number, string>;
  insSignature: Map<number, string>;
  vars: Map<number, string>;
  varType: Map<number, string>;
  timelineIns: Map<number, string>;
  timelineInsSignature: Map<number, string>;
}

export function parseEclmap(text: string): Eclmap {
  const parser = new EclmapParser(text);
  parser.parse();
  const {ins, insSignature, vars, varType, timelineIns, timelineInsSignature} = parser;

  return {ins, insSignature, vars, varType, timelineIns, timelineInsSignature};
}

// This is largely unmodified from Priw's code, which appears to be a translation of C code into JS.
//
// I don't want to risk changing its behavior while cleaning it up, so let's just sweep it under the rug.  - Exp
class EclmapParser {
  constructor(txt) {
    this.kind = null;

    this.ins = new Map();
    this.timelineIns = new Map();
    this.vars = new Map();
    this.insSignature = new Map();
    this.timelineInsSignature = new Map();
    this.varType = new Map();

    this.currentSeqmap = null;
    this.ident = 0;

    txt = txt.replace(/\r/g, "");
    this.file = txt.split("\n");
    this.strtok_tmp = "";
    this.line = 0;
  }

  err(txt) {
    throw new Error(`eclmap parse error at line ${this.line}: ${txt}`);
  }
  fgets() {
    ++this.line;
    if (this.file.length == 0) return null;
    return this.file.splice(0, 1)[0];
  }
  strtok(str, delim) {
    if (str != null) this.strtok_tmp = str;
    let pos = 0;
    while (this.strtok_tmp.length > pos && delim.indexOf(this.strtok_tmp[pos]) > -1) ++pos;

    this.strtok_tmp = this.strtok_tmp.substring(pos);
    pos = 0;
    while (this.strtok_tmp.length > pos && delim.indexOf(this.strtok_tmp[pos]) == -1) ++pos;

    const ret = this.strtok_tmp.substring(0, pos);
    this.strtok_tmp = this.strtok_tmp.substring(pos);
    return ret;
  }
  parse() {
    const magic = this.fgets();
    if (magic == "!eclmap") {
      this.kind = "ecl";
      this.parseNew(magic);
    } else if (magic == "!anmmap" || magic == '!stdmap') {
      this.kind = "anm";
      this.parseNewAnm();
    } else {
      this.err(`map file has bad magic: ${magic}`);
      this.kind = null;
    }
  }

  control(arg) {
    switch (arg) {
      case "!ins_names":
        this.ident = 1;
        this.currentSeqmap = this.ins;
        break;
      case "!ins_signatures":
        this.ident = 0;
        this.currentSeqmap = this.insSignature;
        break;
      case "!gvar_names":
        this.ident = 1;
        this.currentSeqmap = this.vars;
        break;
      case "!gvar_types":
        this.ident = 0;
        this.currentSeqmap = this.varType;
        break;
      case "!timeline_ins_names":
        this.ident = 1;
        this.currentSeqmap = this.timelineIns;
        break;
      case "!timeline_ins_signatures":
        this.ident = 0;
        this.currentSeqmap = this.timelineInsSignature;
        break;
      default:
        this.err(`unknown control line: ${arg}`);
        return 1;
    }
    return 0;
  }

  isKeyword(str) {
    if (this.kind === "ecl") {
      return [
        "anim", "ecli", "sub", "timeline",
        "var", "int", "float", "void",
        "inline", "return", "goto", "unless",
        "if", "else", "do", "while",
        "times", "switch", "case", "default",
        "break", "async", "global", "sin",
        "cos", "sqrt", "rad", "false", "true",
      ].indexOf(str) > -1;
    } else {
      return false;
    }
  }

  validateIdent(str) {
    if (str.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) == null) {
      this.err(`'${str}' isn't a valid identifier`);
      return 1;
    }
    if (str.substring(0, 4) === "ins_") {
      this.err("mnemonic can't start with ins_");
      return 1;
    }
    if (this.isKeyword(str)) {
      this.err(`'${str}' is a keyword, ignoring`);
      return 1;
    }
    return 0;
  }

  validateType(str) {
    if (str !== "$" && str !== "%") {
      this.err(`unknown type '${str}'`);
      return 1;
    }
    return 0;
  }

  validateSignature(str) {
    // not implemented
    return 0;
  }

  set(num, name) {
    if (this.ident) {
      if (this.validateIdent(name)) return 1;
    } else if (this.currentSeqmap == this.globals_types) {
      if (this.validateType(name)) return 1;
    } else {
      if (this.validateSignature(name)) return 1;
    }
    this.currentSeqmap.set(num, name);
  }

  parseNew(magic) {
    this.control("!ins_names"); // default
    this.seqmapLoad();
  }

  parseNewAnm(magic) {
    this.control("!ins_names"); // default
    this.seqmapLoad();
  }

  seqmapLoad() {
    let line = null;
    while ((line = this.fgets()) != null) {
      // Remove comments.
      line = line.split("#")[0];

      let token = this.strtok(line, " \t\n");
      if (!token) continue; // 0 tokens = empty line

      if (token[0] === "!") {
        this.control(token);
        continue;
      }

      const num = parseInt(token);
      if (isNaN(num)) {
        this.err("key token is not a number");
        return;
      }

      token = this.strtok(null, " \t\n");
      if (!token) {
        this.err("not enough tokens");
        return;
      }

      if (token === "_") token = ""; // specify empty strings with _

      this.set(num, token);
    }
  }
}
