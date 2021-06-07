import * as React from 'react';
import {useAsync} from 'react-async';

import {TrustedMarkdown} from './Markdown';
import {Err} from './Error';

export function MarkdownPage({path}: {path: string}) {
  // BEWARE: useAsync only pays attention to changes in the callback, not in the additional arguments provided
  //         alongside promiseFn, so it's safer to just have an empty arguments object and use useCallback.
  const fetchMd = React.useCallback(async ({}, {signal}: AbortController) => {
    const response = await fetch(path, {signal, redirect: 'error'});
    if (!response.ok) throw new Error(`${response.status}`);
    return response.text();
  }, [path]);

  const {data, error, isPending} = useAsync({promiseFn: fetchMd}, {});
  if (isPending) return <>Loading content...</>;
  if (error) return <Err>{error.message}</Err>;
  if (data) return <TrustedMarkdown>{data}</TrustedMarkdown>;
  return null;
}
