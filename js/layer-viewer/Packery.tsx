import React from 'react';
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

export const PackeryItem = React.memo(function PackeryItem({children}: {children: React.ReactElement}) {
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

  return <div className='grid-item' ref={ref} style={visible ? undefined : {opacity: 0}}>{children}</div>;
});
