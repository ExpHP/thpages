import React from 'react';
import clsx from 'clsx';
import type PackeryClass from 'packery';

const PackeryPromise = import('packery') as unknown as Promise<typeof PackeryClass>; // big module
const PackeryContext = React.createContext<PackeryClass | null>(null);

/**
 * Very simple (but limited!) wrapper around Packery.
 *
 * All children must be wrapped in <PackeryItem>, which will place a DIV around them.
 *
 * CAUTION: Items cannot be removed from this.
 */
export function Packery({packeryOptions={}, children, ...props}: {packeryOptions: any, children: React.ReactElement[]} & React.PropsWithoutRef<React.HTMLAttributes<HTMLDivElement>>) {
  const ref = React.useRef<null | HTMLDivElement>(null);
  const [packery, setPackery] = React.useState<null | PackeryClass>(null);

  React.useEffect(() => {
    const abort = new AbortController();

    (async () => {
      const PackeryClass = await PackeryPromise;
      if (abort.signal.aborted) return;

      if (!ref.current) {
        throw new Error("unexpected null ref");
      }

      setPackery(new PackeryClass(ref.current, {...packeryOptions, itemSelector: '.grid-item'}));
    })();

    return () => abort.abort();
  }, [packeryOptions]);

  React.useEffect(() => {
    if (!packery) return;
    return () => packery.destroy();
  }, [packery]);

  return <div ref={ref} {...props}>
    {packery && <PackeryContext.Provider value={packery as PackeryClass}>{children}</PackeryContext.Provider>}
  </div>;
}

export const PackeryItem = React.memo(function PackeryItem({children, ...props}: {children: React.ReactElement} & React.HTMLAttributes<HTMLDivElement>) {
  const [visible, setVisible] = React.useState(false);
  const packery = React.useContext(PackeryContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (packery && ref.current) {
      packery.appended(ref.current);
      setVisible(true);
    }
    // FIXME: it is unclear how to inform Packery about removed items; it has a .remove() method, but that
    //        method also removes the element directly from the DOM.  (probably because it wants to animate them out...)
  }, [packery]);

  props = {
    ...props,
    style: {
      ...props.style,
      ...(visible ? undefined : {opacity: 0}),
    },
    className: clsx('grid-item', props.className),
  };

  return <div {...props} ref={ref}>{children}</div>;
});




// import React from 'react';
// import type PackeryClass from 'packery';

// import {Cancel} from './LayerViewer';
// import {useDependentState} from '~/js/XUtil';

// const PackeryPromise = import('packery') as unknown as Promise<typeof PackeryClass>; // big module
// const PackeryContext = React.createContext<PackeryClass | null>(null);

// /**
//  * Very simple (but limited!) wrapper around Packery.
//  *
//  * All children must be wrapped in <PackeryItem>, which will place a DIV around them.
//  *
//  * CAUTION: Items cannot be removed from this.
//  */
// export function Packery({packeryOptions={}, children, ...props}: {packeryOptions: any, children: React.ReactElement[]} & React.PropsWithoutRef<React.HTMLAttributes<HTMLDivElement>>) {
//   const ref = React.useRef<null | HTMLDivElement>(null);
//   const [packery, setPackery] = React.useState<null | PackeryClass>(null);
//   const [updateCounter, setUpdateCounter] = React.useState(0);

//   const [numItemsReadyToShow, setNumItemsReadyToShow] = useDependentState(0, [packery]);
//   const [numItemsInPackery, setNumItemsInPackery] = useDependentState(0, [packery]);

//   React.useEffect(() => {
//     const abort = new AbortController();

//     (async () => {
//       const PackeryClass = await PackeryPromise;
//       if (abort.signal.aborted) return;

//       if (!ref.current) {
//         throw new Error("unexpected null ref");
//       }

//       setPackery(new PackeryClass(ref.current, {...packeryOptions, itemSelector: '.grid-item'}));
//     })();

//     return () => abort.abort();
//   }, [packeryOptions]);

//   React.useEffect(() => {
//     if (!packery) return;

//     const intervalId = setInterval(() => setUpdateCounter((count) => count + 1), 750);
//     return () => {
//       clearInterval(intervalId);
//       packery.destroy();
//     };
//   }, [packery]);

//   // Each time the interval ticks, we want to add all new items to packery.
//   const refUsedToSmuggleInItemsLength = React.useRef(0); // to hide from the exhaustive-deps lint, and to show we mean it
//   refUsedToSmuggleInItemsLength.current = items.length;
//   React.useEffect(() => {
//     if (!packery) return;
//     console.log('layout');
//     // packery.layout();

//     // While we *could* call Packery.appended right now, that would force this effect to run twice (due to how we would
//     // need to use numItemsInPackery), and it's possible that another item could be inserted before the second run
//     // (bringing us back to the very slow world of adding 1 item at a time).
//     //
//     // Thus, an intermediate state variable 'numItemsReadyToShow' is used.
//     setNumItemsReadyToShow(refUsedToSmuggleInItemsLength.current);
//   }, [setNumItemsReadyToShow, updateCounter]);
//   // }, [packery, updateCounter]);

//   React.useEffect(() => {
//     if (!packery) return;
//     // packery.layout();
//     packery.appended();
//   }, [packery, setNumItemsInPackery, numItemsInPackery, numItemsReadyToShow]);

//   return <div ref={ref} {...props}>
//     {packery && <PackeryContext.Provider value={packery as PackeryClass}>{children}</PackeryContext.Provider>}
//   </div>;
// }

// export const PackeryItem = React.memo(function PackeryItem({children, ...props}: {children: React.ReactElement} & React.HTMLAttributes<HTMLDivElement>) {
//   // const [visible, setVisible] = React.useState(false);
//   const packery = React.useContext(PackeryContext);
//   const ref = React.useRef<HTMLDivElement | null>(null);
//   const visible = true;

//   // setVisible(true);

//   // React.useEffect(() => {
//   //   if (packery && ref.current) {
//   //     packery.appended(ref.current);
//   //     setVisible(true);
//   //   }
//   //   // FIXME: it is unclear how to inform Packery about removed items; it has a .remove() method, but that
//   //   //        method also removes the element directly from the DOM.  (probably because it wants to animate them out...)
//   // }, [packery]);
//   // const props = {
//   //   ...props,
//   //   style: {
//   //     ...props.style,
//   //     visible ? undefined : {opacity: 0},
//   //   }
//   // };

//   return <div className='grid-item' ref={ref} {...props}>{children}</div>;
// });
