import React from 'react';

import {Err} from './Error';
import {Ref, InsData, VarData} from './tables';
import {useRefData, getRefName} from './InlineRef';
import {useNameSettings} from './settings';

/* eslint-disable react/display-name */
const INS_PARAMETER_TABLE: {[s: string]: (name: string) => JSX.Element} = {
  "S": (name: string) => <><span className="type int">int</span>&nbsp;{name}</>,
  "s": (name: string) => <><span className="type int">short</span>&nbsp;{name}</>,
  "b": (name: string) => <><span className="type int">byte</span>&nbsp;{name}</>,
  "$": (name: string) => <><span className="type int mut">{"int&"}</span>&nbsp;{name}</>,
  "f": (name: string) => <><span className="type float">float</span>&nbsp;{name}</>,
  "%": (name: string) => <><span className="type float mut">{"float&"}</span>&nbsp;{name}</>,
  "m": (name: string) => <><span className="type string">string</span>&nbsp;{name}</>,
  "_": () => <><span className="type unused">__</span></>,
  "?": () => <><span className="type unknown">???...</span></>,
};
/* eslint-enable */

export function InsSiggy({r, data}: {r: Ref, data: InsData}) {
  const nameSettings = useNameSettings();
  const refData = useRefData(r);
  if (!(refData)) {
    return <Err>{`REF_ERROR(${r})`}</Err>;
  }
  const name = getRefName(r, refData, nameSettings);

  return <div className="ins-siggy-wrapper">
    <span className="ins-name" data-wip={data.wip}>{name}</span>
    <span className="punct">(</span>
    <InsParameters ins={data} />
    <span className="punct">)</span>
  </div>;
}

function InsParameters({ins}: {ins: InsData}) {
  const ret = [];
  for (let i=0; i<ins.args.length; ++i) {
    switch (i) {
      // Allow breaking after the opening parenthesis
      case 0: ret.push(<wbr key={`w-${i}`} />); break;
      default: ret.push(<span key={`c-${i}`} className="punct">{", "}</span>); break;
    }
    ret.push(<InsParameter key={`p-${i}`} type={ins.sig[i]} name={ins.args[i]} />);
  }
  return <>{ret}</>;
}

function InsParameter({type, name}: {type: string, name: string}) {
  const err = () => <Err>{`BAD_TYPE('${type}', '${name}')`}</Err>;
  const body = (INS_PARAMETER_TABLE[type] || err)(name);
  return <span className="ins-params">{body}</span>;
}

export function VarHeader({r, data}: {r: Ref, data: VarData}) {
  const nameSettings = useNameSettings();
  const refData = useRefData(r);
  if (!(refData)) {
    return <Err>{`REF_ERROR(${r})`}</Err>;
  }
  const name = getRefName(r, refData, nameSettings);
  return <span className="var-header" data-wip={data.wip}>{name}</span>;
}
