import React from 'react';
import {Async} from 'react-async';
import type PackeryClass from 'packery';

import {Err} from '~/js/Error';

const PackeryPromise = import('packery') as unknown as Promise<typeof PackeryClass>; // big module
const PackeryContext = React.createContext<PackeryClass | null>(null);

export function Packery({packeryOptions={}, children, ...props}: {packeryOptions: any, children: React.ReactElement[]} & React.PropsWithoutRef<React.HTMLAttributes<HTMLDivElement>>) {
  const ref = React.useRef<null | HTMLDivElement>(null);

  const promiseFn = React.useCallback(async () => {
    console.log('packery');
    const PackeryClass = await PackeryPromise;
    if (!ref.current) {
      throw new Error("unexpected null ref");
    }

    return new PackeryClass(ref.current, {...packeryOptions, itemSelector: '.grid-item'});
  }, [packeryOptions]);

  return <div ref={ref} {...props}>
    <Async promiseFn={promiseFn}>
      <Async.Fulfilled>{(packery) => (
        <PackeryContext.Provider value={packery as PackeryClass}>
          {children}
        </PackeryContext.Provider>
      )}</Async.Fulfilled>
      <Async.Rejected>{(e) => <Err>{e.message}</Err>}</Async.Rejected>
    </Async>
  </div>;
}

export const PackeryItem = React.memo(function PackeryItem({children}: {children: React.ReactElement}) {
  const packery = React.useContext(PackeryContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (packery && ref.current) {
      packery.appended(ref.current);
    }
  });

  return <div className='grid-item' ref={ref}>{children}</div>;
});


// // HOC that must be used to wrap any components used as children to a Packery.
// export function makePackeryItem<P = {}>(Component: React.FC<P>) {
//   return function PackeryItem(props: P) {
//     const packery = React.useContext(PackeryContext);
//     const ref = React.useRef<Element | null>(null);

//     React.useEffect(() => {
//       if (packery && ref.current) {
//         packery.appended(ref.current);
//       }
//     });

//     return <Component {...props} ref={ref} />;
//   };
// }
