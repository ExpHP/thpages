let generatedVarTable = "";
function generateVarTable() {
    if (generatedVarTable) return generatedVarTable;
    let html = "";
    html += "<table>";
    html += "<tr><th>ID</th><th>type</th><th>access</th><th>scoping</th><th>name</th><th>description</th></tr>";
    for (let i=-10000; typeof VARS[i] != "undefined"; i++) {
        html += getVarTableRow(VARS[i], i);
    }
    html += "</table>";
    html = MD.makeHtml(html);
    generatedVarTable = html;
    return html;
}

function getVarTableRow(entry, id) {
    if (entry == null) return "";
    let [game, type, access, scope, name, desc] = entry;
    let idString = id + (type == "$" ? "" : ".0f");
    let typeString = type == "$" ? "int" : "float";
    let accessString = access == "rw" ? "read/write" : "read-only";
    let scopeString = scope == "g" ? "global" : "local";
    return `<tr style='color:%GAMECOLOR-${game}%'><td>${idString}</td><td>${typeString}</td><td>${accessString}</td><td>${scopeString}</td><td>${type+name}</td><td>${desc}</td></tr>`;
}

function addTooltips(txt) {
    let codeTags = txt.match(/`(.*?)`/g);
    let dupes = [];
    if (codeTags == null) return txt;
    for (let i=0; i<codeTags.length; i++) {
        let expr = codeTags[i].substring(1, codeTags[i].length-1);
        if (dupes.indexOf(expr) > -1) continue;
        dupes.push(expr);
        let tip;
        if (expr.charAt(0) == "%" || expr.substring(0, 2) == "¨D") tip = getVarTip(expr);
        else tip = getOpcodeTip(expr);
        if (tip) {
            tip = MD.makeHtml(tip).replace(/'/g, "&apos;");
            txt = txt.replace(new RegExp("`"+expr+"`", "g"), "<span data-tip='"+tip+"'>`"+expr+"`</span>");
        }
    }
    return txt;
}

function getVarTip(expr) {
    let [entry, id] = getVariableByName(expr);
    if (entry == null) return "";
    let [game, type, access, scope, name, desc] = entry;
    let idString = id + (type == "$" ? "" : ".0f");
    let typeString = type == "$" ? "int" : "float";
    let accessString = access == "rw" ? "read/write" : "read-only";
    let scopeString = scope == "g" ? "global" : "local";
    let tip = `**${idString} - ${type+name}** - ${scopeString}, ${accessString}, ${typeString} variable[br][hr]${desc}`;
    return tip;
}

function getVariableByName(expr) {
    let type, name;
    if (expr.charAt(0) == "%") {
        type = "%";
        name = expr.substring(1);
    } else {
        type = "$";
        name = expr.substring(2);
    }
    for (let i in VARS) {
        if (VARS[i] == null) continue;
        if (VARS[i][4] == name && VARS[i][1] == type) return [VARS[i], i];
    }
    return [null, -1];
}

function getOpcodeTip(expr) {
    let opcode = getOpcodeByName(expr);
    if (opcode == null) return "";
    let args = "";
    let desc = opcode.description;
    for (let i=0; i<opcode.args.length; i++) {
        if (i > 0) args += ", ";
        args += ARGTYPES[opcode.args[i]] + " " + opcode.argnames[i];
        desc = desc.replace("%"+(i+1), "`"+opcode.argnames[i]+"`");
    }
    return `**${opcode.number} - ${opcode.name}(${args})**[br][hr]${desc}`;
}

function getOpcodeByName(name) {
    for (let i in INS) {
        if (INS[i].name == name) return INS[i];
    }
    return null;
}
