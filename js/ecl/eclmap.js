let currentMap = null;
const cachedMaps = {};

async function loadEclmap(file, name, game) {
  if (cachedMaps[name]) {
    currentMap = cachedMaps[name];
    return;
  }

  let txt;
  if (file == null) txt = await autoEclmap(game);
  else txt = await fileEclmap(file);

  const map = parseEclmap(txt);
  if (!cachedMaps[name]) cachedMaps[name] = map;
}

async function fileEclmap(file) {
  const fr = new window.FileReader();
  fr.readAsText(file);
  const txt = await new Promise((resolve, reject) => {
    fr.onload = () => resolve(fr.result);
  });
  return txt;
}

function parseEclmap(txt, name) {
  const map = new Eclmap(txt);
  currentMap = map;
  return map;
}

async function autoEclmap(game) {
  const res = await window.fetch(`eclmap/anmmap/v8.anmm`);
  if (res.ok) {
    const txt = await res.text();
    return txt;
  } else return null;
}

class Eclmap {
  constructor(txt) {
    this.is_new = false;
    this.kind = null;

    // old eclmaps
    this.opcodes = {};
    this.timeline_opcodes = {};
    this.globals = {};

    // new eclmaps
    this.ins = [];
    this.timeline_ins = [];
    this.var = [];
    this.ins_sig = [];
    this.timeline_ins_sig = [];
    this.var_types = [];

    this.currentSeqmap = null;
    this.ident = 0;

    txt = txt.replace(/\r/g, "");
    this.file = txt.split("\n");
    this.strtok_tmp = "";
    this.line = 0;
    this.parse();
  }
  getMnemonic(num) {
    if (!this.is_new) {
      if (this.opcodes[num]) return this.opcodes[num];
    } else {
      const ent = this.seqmapGet(this.ins, num);
      if (ent != null) return ent.name;
    }
    return `ins_${num}`;
  }
  getTimelineMnemonic(num) {
    if (!this.is_new) {
      if (this.timeline_opcodes[num]) return this.timeline_opcodes[num];
    } else {
      const ent = this.seqmapGet(this.timeline_ins, num);
      if (ent != null) return ent.name;
    }
    return `ins_${num}`;
  }
  getGlobal(num) {
    if (!this.is_new) {
      if (this.globals[num]) return this.globals[num];
    } else {
      const ent = this.seqmapGet(this.var, num);
      if (ent != null) return ent.name;
    }

    return `[${num}]`;
  }
  err(txt) {
    window.alert(`eclmap parse error at line ${this.line}: ${txt}`);
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
      this.is_new = true;
      this.kind = "ecl";
      this.parseNew(magic);
    } else if (magic == "!anmmap") {
      this.is_new = true;
      this.kind = "anm";
      this.parseNewAnm(magic);
    } else {
      this.err(magic);
      // old format
      this.kind = "ecl";
      this.parseOld();
    }
  }
  parseOld() {
    let line;
    while ((line = this.fgets()) != null) {
      // Remove comments.
      line = line.split("#")[0];
      let token = this.strtok(line, " \t\n");
      if (!token) continue; // 0 tokens = empty line
      const num = parseInt(token);
      if (isNaN(num)) return this.err("opcode is not a number");

      token = this.strtok(null, " \t\n");
      if (!token) return this.err("not enough tokens");
      const group = token == '?' ? this.opcodes : (token == '@' ? this.timeline_opcodes : this.globals);

      token = this.strtok(null, " \t\n");
      if (!token) return this.err("not enough tokens");

      // validate mnemonic
      if (!token.match(/[a-zA-Z_][a-zA-Z_0-9]*/)) return this.err(token + "isn't a valid identifier");
      if (token.substring(0, 4) == "ins_") return this.err("mnemonic can't start with ins_");

      group[num] = token;
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
        this.currentSeqmap = this.ins_sig;
        break;
      case "!gvar_names":
        this.ident = 1;
        this.currentSeqmap = this.var;
        break;
      case "!gvar_types":
        this.ident = 0;
        this.currentSeqmap = this.var_types;
        break;
      case "!timeline_ins_names":
        this.ident = 1;
        this.currentSeqmap = this.timeline_ins;
        break;
      case "!timeline_ins_signatures":
        this.ident = 0;
        this.currentSeqmap = this.timeline_ins_sig;
        break;
      default:
        this.err(`unknown control line: ${arg}`);
        return 1;
    }
    return 0;
  }

  isKeyword(str) {
    if (this.kind == "ecl") {
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
    if (str.substring(0, 4) == "ins_") {
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
    if (str != "$" && str != "%") {
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
    this.seqmapSet(this.currentSeqmap, num, name);
  }

  parseNew(magic) {
    this.control("!ins_names"); // default
    this.seqmapLoad("!eclmap", this.set.bind(this), this.control.bind(this), magic);
  }

  parseNewAnm(magic) {
    this.control("!ins_names"); // default
    this.seqmapLoad("!anmmap", this.set.bind(this), this.control.bind(this), magic);
  }

  seqmapLoad(magic, set, control, line) {
    if (line != magic) {
      this.err("invalid magic");
      return;
    }
    while ((line = this.fgets()) != null) {
      // Remove comments.
      line = line.split("#")[0];

      let token = this.strtok(line, " \t\n");
      if (!token) continue; // 0 tokens = empty line

      if (token[0] == "!") {
        control(token);
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

      if (token == "_") token = ""; // specify empty strings with _

      set(num, token);
    }
  }

  seqmapSet(seqmap, num, name) {
    seqmap.push({
      num: num,
      name: name,
    });
  }

  seqmapGet(seqmap, num) {
    for (let i=seqmap.length-1; i>=0; --i) {
      if (seqmap[i].num == num) {
        return seqmap[i];
      }
    }
    return null;
  }

  seqmapFind(seqmap, name) {
    for (let i=seqmap.length-1; i>=0; --i) {
      if (seqmap[i].name == name) {
        return seqmap[i];
      }
    }
    return null;
  }
}
