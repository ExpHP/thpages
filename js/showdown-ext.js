let ext = function() {
    let yt = {
        type: "lang",
        regex: /\[yt\](.*?)\[\/yt\]/g,
        replace: '<div class="fit-wrapper" data-yt="$1"><div class="fit-wrapper2 yt"><div class="video-load"><div>Automatic video loading is <b>disabled</b>, in order to reduce network usage and loading times.<br>Click this to load the video.</div></div></div></div>'
    };
    let hr = {
        type: "lang",
        regex: /\[hr\]/g,
        replace: "<hr>"
    }
    let br = {
        type: "lang",
        regex: /\[br\]/g,
        replace: "<br>"
    }
    let ts = {
        type: "lang",
        regex: /\[timestamp=(.*?)\]/g,
        replace: "<div style='float: right'>$1</div>"
    }
    let img = {
        type: "lang",
        regex: /\[img=(.*?), hratio=(.*?)\]/g,
        replace: '<div class="fit-wrapper"><div class="fit-wrapper2" style="padding-top: $2%"><img title="$1" style="cursor:pointer;" onclick="window.open(\'$1\')" src="$1"></div></div>'
    }
    let img_small = {
        type: "lang",
        regex: /\[img=(.*?)]/g,
        replace: '<img title="$1" style="cursor:pointer; margin: 5px;" onclick="window.open(\'$1\')" src="$1">'		
    }

    let jank = document.createElement("textarea");
    jank.classList.add("clipboard-jank");
    let cnt = 0;
    let code = {
        type: "lang",
        regex: /\[code\]([^]+?)\[\/code\]/g,
        replace: function(match, content) {
            let ret = "<hljs>"+highlightCode(content)+"</hljs>";
            // This is some quality jank right here, caused by the fact that I could not find a way to make hljs not escape this html
            ret = ret.replace(/&lt;instr data-tip=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/instr&gt;/g, (match, tip, content) => {
                return `<span data-tip=${tip.replace(/&amp;/g, "&")}>${content}</span>`
            });
            ret = ret.replace(/&lt;instr&gt;(.*?)&lt;\/instr&gt;/g, (match, content) => {
                return `<span>${content}</span>`
            });
            ret = ret.replace(/\\\\/g, "\\");
            return ret;
        }
    }

    let title = {
        type: "lang",
        regex: /\[title=(.*?)\]\n/,
        replace: function(match, content) {
            setWindowTitleDirect(content);
            return "";
        }
    }

    let c = {
        type: "lang",
        regex: /\[c=(.*?)\]([^]*?)\[\/c\]/g,
        replace: "<span style='color: $1'>$2</span>"
    }

    let replaceId = 0;
    let include = {
        type: "lang",
        regex: /\[include=(.*?)\]/g,
        replace: function(match, include) {
            let id = replaceId++;
            getInclude(include, id);
            return "<div id='included-content-"+id+"'>Loading...</div>";
        }
    }

    let colors = {
        6: "#ff5959",
        7: "#62ffff",
        8: "#c0b6d6",
        9: "#ff82c0",
        95: "#ebc996",
        10: "#fafca2",
        11: "#adb0e6",
        12: "lightgreen",
        125: "orange",
        128: "#40ffeb",
        13: "lightblue",
        14: "#cf943a",
        143: "#ff9eb9",
        15: "#f6d7ff",
        16: "#63f863",
        165: "violet",
        17: "#ff6565"
    }

    let game = {
        type: "lang",
        regex: /\[game=([0-9]*?)\]([^]*?)\[\/game\]/g,
        replace: function(match, game, txt) {
            return "<span style='color: "+colors[game]+"'>"+txt+"</span>";
        }
    }

    let rawGame = {
        type: "lang",
        regex: /%GAMECOLOR-([0-9]*?)%/g,
        replace: function(match, game) {
            return colors[game];
        }
    }

    // disable markdown in region
    let html = {
        type: "lang",
        regex: /\[html\]([^]*?)\[\/html\]/g,
        replace: "$1"
    }

    let script = {
        type: "lang",
        regex: /\[script\]([^]*?)\[\/script\]/g,
        replace: function(match, content) {
            const $script = document.createElement("script");
            $script.innerHTML = content;
            $scriptContent.appendChild($script);
            return "";
        }
    }

    let ins = {
        type: "lang",
        regex: /\[ins=(.*?),(.*?)\]/g,
        replace: function(match, num, game) {
            let timeline = false;
            if (game[0] == "t") {
                timeline = true;
                game = game.substring(1);
            }
            const ins = getOpcode(parseFloat(game), parseInt(num), timeline);
            if (ins == null) return "`opcode_error_"+num+"`";
            let tip = getOpcodeTip(ins, timeline);
            return "<instr data-tip=\""+tip+"\">"+getOpcodeName(ins.number, ins.documented, timeline)+"</instr>";
        }
    }
    let ins_notip = {
        type: "lang",
        regex: /\[ins_notip=(.*?),(.*?)\]/g,
        replace: function(match, num, game) {
            let timeline = false;
            if (game[0] == "t") {
                timeline = true;
                game = game.substring(1);
            }
            const ins = getOpcode(parseFloat(game), parseInt(num), timeline);
            if (ins == null) return "`opcode_error_"+num+"`";
            return "<instr>"+getOpcodeName(ins.number, ins.documented, timeline)+"</instr>";
        }
    }

    let variable = {
        type: "lang",
        regex: /\[var=(-?.*?),(.*?)\]/g,
        replace: function(match, num, game) {
            const variable = getVar(normalizeGameVersion(game), parseInt(num));
            if (variable == null) return "<instr>variable_error_"+num+"</instr>";
            let tip = getVarTip(variable);
            return "<instr data-tip=\""+tip+"\">"+getVarName(num, variable.documented) +"</instr>";
        }
    }

    let variable_notip = {
        type: "lang",
        regex: /\[var_notip=(-?.*?),(.*?)\]/g,
        replace: function(match, num, game) {
            const variable = getVar(normalizeGameVersion(game), parseInt(num));
            if (variable == null) return "<instr>variable_error_"+num+"</instr>";
            return "<instr>"+getVarName(num, variable.documented)+"</instr>";
        }
    }

    let tip = {
        type: "lang",
        regex: /\[tip=(.*?)\]([^]*?)\[\/tip\]/g,
        replace: `<span data-tip='$1'>$2</span>`
    }

    async function requireEclmap(game, content, id) {
        // this must always wait at least some time, to make sure that the function this was called from finished running...
        await new Promise(resolve => setTimeout(resolve, 1));
        game = parseFloat(game);
        await loadEclmap(null, "?"+game, game);
        const $replace = document.querySelector(`#require-eclmap-${id}`);
        if ($replace != null) {
            $replace.innerHTML = MD.makeHtml(content);
        }
    }

    let eclmapId = 0;
    let eclmap = {
        type: "lang",
        regex: /\[requireEclmap=([0-9]+?)\]([^]*?)\[\/requireEclmap\]/g,
        replace: function(match, num, content) {
            let id = eclmapId++;
            requireEclmap(num, content, id);
            return "<div id='require-eclmap-"+id+"'>Loading eclmap...</div>";
        }
    }

    /*let eclTooltips = {
        type: "lang",
        filter: function(text) {
            return addTooltips(text);
        }
    }*/

    let video = {
        type: "lang",
        regex: /\[video=(.*?), hratio=(.*?)\]/g,
        replace: '<div class="fit-wrapper" data-video="$1"><div class="fit-wrapper2" style="padding-top: $2%"><div class="video-load"><div>Automatic video loading is <b>disabled</b>, in order to reduce network usage and loading times.<br>Click this to load the video.</div></div></div></div>'
    }

    let flex = {
        type: "lang",
        regex: /\[flex\]([^]*?)\[\/flex\]/g,
        replace: '<div class="flexbox">$1</div>'
    }

    let flex2 = {
        type: "lang",
        regex: /\[flex=(.*?)\]([^]*?)\[\/flex\]/g,
        replace: '<div class="flexbox" style="align-items: $1">$2</div>'
    }

    let et = {
        type: "lang",
        regex: /\[et=(.*?),(.*?),(.*?)\]/g,
        replace: (match, id, color, game) => {
            const xBegin32 = 112;
            const yBegin32 = 32;
            const rows32 = {
                0: 0,
                1: 0,
                2: 1,
                3: 2,
                4: 3,
                5: 3,
                6: 4,
                7: 4,
                8: 5,
                35: 5,
                9: 6,
                10: 7,
                36: 7,
                11: 8,
                12: 9,
                13: 10,
                14: 11,
                15: 12,
                16: 13,
                37: 13,
                34: 14,
                38: 15,
                // row 16 has numbers
                17: 17
            }
            const xBegin64 = 112;
            const yBegin64 = 636;
            const rows64 = {
                18: 0,
                19: 0,
                30: 0,
                20: 1,
                21: 2,
                22: 3,
                23: 4,
                24: 4,
                29: 5,
                31: 6,
                43: 7,
                25: 8,
                26: 9,
                27: 10,
                28: 11,
                39: 12,
                40: 13,
                41: 14,
                42: 15
            }
            const animes = {
                16: "animation-name: spin; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                37: "animation-name: spin; animation-direction: reverse; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                23: "animation-name: spin; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                24: "animation-name: spin; animation-direction: reverse; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                35: "animation-name: spin; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                36: "animation-name: spin; animation-duration: 1.5s; animation-iteration-count: infinite; animation-timing-function: linear;",
                32: "animation-name: spin; animation-duration: 0.15s; animation-iteration-count: infinite; animation-timing-function: linear;",

                30: "animation-name: pulse; animation-direction: alternate; animation-duration: 0.1s; animation-iteration-count: infinite; animation-timing-function: linear;"
            }
            const anime = animes[id] ? animes[id] : "";
            const tip = `<instr>etSprite(${id}, ${color})</instr>, version ${game}`;
            if (typeof rows32[id] != "undefined") {
                return `<div data-tip="${tip}" style="${anime} display: inline-block; width:32px; height:32px; background-image: url(img/et15.png); background-position: -${xBegin32 + color*32}px -${yBegin32 + rows32[id]*32}px;"></div>`
            } else if (typeof rows64[id] != "undefined") {
                return `<div data-tip="${tip}" style="${anime} display: inline-block; width:64px; height:64px; background-image: url(img/et15.png); background-position: -${xBegin64 + color*64}px -${yBegin64 + rows64[id]*64}px;"></div>`
            } else {
                if (id == 33) {
                    return `<div data-tip="${tip}" style="${anime} display: inline-block; width:128px; height:100px; background-image: url(img/et15.png); background-position: -${xBegin64 + (color % 4)*128}px -${1861 + Math.floor(color / 4)*128}px;"></div>`
                } else if (id == 32) {
                    return `<div data-tip="${tip}" style="${anime} display: inline-block; width:128px; height:128px; background-image: url(img/et15.png); background-position: -${xBegin64 + color*128}px -1692px;"></div>`
                } else {
                    return "et-error";
                }
            }
        }
    }

    async function requireAnm(name, content, id) {
        // this must always wait at least some time, to make sure that the function this was called from finished running...
        await new Promise(resolve => setTimeout(resolve, 1));
        await getAnm(name);
        const $replace = document.querySelector(`#require-anm-${id}`);
        if ($replace != null) {
            $replace.innerHTML = MD.makeHtml(content);
        }
    }

    let anmId = 0;
    let currentAnm = "";
    let anmSelect = {
        type: "lang",
        regex: /\[requireAnm=(.*?)\]([^]*?)\[\/requireAnm\]/g,
        replace: function(match, name, content) {
            let id = anmId++;
            currentAnm = name;
            requireAnm(name, content, id);
            return "<div id='require-anm-"+id+"'>Loading ANM...</div>";
        }
    }

    let anm = {
        type: "lang",
        regex: /\[anm=(.*?),(.*?),(.*?)\]/g,
        replace: function(match, anm, game, id) {
            if (!anmCache[currentAnm])
                return "anm-error";
            
            return `<div data-tip="<instr>${anm}</instr> - <instr>${id}</instr>, version ${game}" style="${getAnmImg(anmCache[currentAnm][anm][game], id)}"></div>`;
        }
    }

    return [anmSelect, eclmap, yt, hr, br, ts, img, img_small, ins, ins_notip,  variable, variable_notip, code, title, c, include, game, rawGame, html, script, tip, video, flex, flex2, et, anm];
}
