/*
 * GridViewScroll performance rewrite
 * Copyright (c) 2020 Michael Lamparski

 * Based on GridViewScroll
 * Copyright (c) 2017 Likol Lee

 * Both are released under the MIT license:

 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// FIXME: incorrect handling of tables with ids (it gets copied without changing the id)
// FIXME: bring back undo() and make it possible to call enhance() again when content changes
//        in a way that invalidates layout.

export type GridViewScrollOnScroll = (arg: {scrollTop: number, scrollLeft: number}) => any;
export type GridViewScrollOptions = {
    table: HTMLTableElement;
    /** Set a width as a number (pixels) or percentage. */
    width?: number | string;
    /** Set a height as a number (pixels) or percentage. */
    height?: number | string;
    /** Derive dimensions from a container element. (takes precedence over `width` and `height`) */
    container?: HTMLElement;
    /** Freeze this many header rows. */
    freezeHeaderRows?: number;
    /** Freeze this many footer rows. */
    freezeFooterRows?: number;
    // FIXME rename to freezeFirstColumns in consideration of RTL
    /** Freeze this many columns. */
    freezeLeftColumns?: number;
    /** Automatically add a class to frozen header <tr> elements. */
    frozenHeaderCssClass?: string;

    /**
     * Automatically add a class to frozen footer <tr> elements.
     *
     * The footer will be superimposed on top of the table, so it should have an opaque background.
     * You can use this to help achieve that.
     * */
    frozenFooterCssClass?: string;

    /**
     * Automatically add a class to frozen <td> and <th> elements.
     *
     * The frozen will be superimposed on top of the table, so it should have an opaque background.
     * You can use this to help achieve that.
     * */
    frozenLeftCssClass?: string;
    onscroll?: GridViewScrollOnScroll;
};

type InternalOptions = {
    container?: HTMLElement;
    width: number | string;
    height: number | string;
    freezeHeaderRows: number;
    freezeLeftColumns: number;
    freezeFooterRows: number;
    frozenHeaderCssClass?: string;
    frozenFooterCssClass?: string;
    frozenLeftCssClass?: string;
    onscroll?: GridViewScrollOnScroll;
};

function normalizeOptions(options: GridViewScrollOptions): InternalOptions {
    return {
        ...options,
        freezeHeaderRows: options.freezeHeaderRows || 0,
        freezeLeftColumns: options.freezeLeftColumns || 0,
        freezeFooterRows: options.freezeFooterRows || 0,
        width: options.width == null ? 700 : options.width,
        height: options.height == null ? 350 : options.height,
    };
}

/** Used to identify existing helpers so that `ensureHelperDivs` is idempotent. */
const CLASS_SIZE_HELPER = 'GridViewScroll-Helper';

// Created DOM structure is like the followingL
//
// <div class="${CLASS_CONTAINER}">
//   <div class="${CLASS_SUPERROW_HEADER}">         // Header is outside the content so that the vertical scrollbar doesn't extend into it.
//     <div class="${CLASS_SUBTABLE_FULL}"></div>   // Full header rows.
//     <div class="${CLASS_SUBTABLE_LEFT}"></div>   // Fixed copy of frozen left header cells.
//   </div>
//   <div class="${CLASS_SUPERROW_CONTENT}">        // Original table, with overflow: auto and header rows set to display:none.
//     <div class="${CLASS_SUBTABLE_FULL}"></div>   // Full non-header rows.
//     <div class="${CLASS_SUBTABLE_LEFT}"></div>   // Fixed copy of frozen left non-header cells.
//     <div class="${CLASS_SUPERROW_FOOTER}">         // Footer is inside content so that horizontal scrollbar is below it.
//       <div class="${CLASS_SUBTABLE_FULL}"></div>   // Full footer rows.
//       <div class="${CLASS_SUBTABLE_LEFT}"></div>   // Fixed copy of frozen left footer cells.
//     </div>
//   </div>
// </div>

const CLASS_CONTAINER = 'GridViewScroll';
const CLASS_SUPERROW_HEADER = 'GridViewScroll-Header';
const CLASS_SUPERROW_CONTENT = 'GridViewScroll-Content';
const CLASS_SUPERROW_FOOTER = 'GridViewScroll-Footer';
const CLASS_SUBTABLE_FULL = 'GridViewScroll-Full';
const CLASS_SUBTABLE_LEFT = 'GridViewScroll-Left';
const CLASS_SUBTABLE_RIGHT = 'GridViewScroll-Right';
const CSS_PATH_SUPERROW_HEADER = `:scope > .${CLASS_SUPERROW_HEADER}`;
const CSS_PATH_SUPERROW_CONTENT = `:scope > .${CLASS_SUPERROW_CONTENT}`;
const CSS_PATH_SUPERROW_FOOTER = `:scope > .${CLASS_SUPERROW_CONTENT} > .${CLASS_SUPERROW_FOOTER}`;

type SuperRow = 'content' | 'header' | 'footer';
type Subtable = 'full' | 'left' | 'right';

type SuperRowTables = {full: TableElements, left?: TableElements, right?: TableElements};
type AllTables = {content: SuperRowTables, header?: SuperRowTables, footer?: SuperRowTables};

type ContentBasedLayoutInfo = {
    headerOffsetHeight: number;
    totalOffsetWidth: number;
    totalOffsetHeight: number;
    scrollbarWidth: number;
};

export class GridViewScroll {
    private options: InternalOptions;
    private mainTable: TableElements;
    private _rootDiv?: HTMLDivElement;
    private layoutInfo?: ContentBasedLayoutInfo;

    constructor(options: GridViewScrollOptions) {
        if (!options.table.parentElement) {
            throw new Error('table must have a parent element');
        }
        this.options = normalizeOptions(options);
        this.mainTable = getTableElements(options.table);
    }

    enhance() {
        // If the user wants to style frozen elements, we must add the classes now before we compute any layout.
        addUserCssClasses(this.mainTable, this.options);

        // NOTE: Reads layout, then modifies DOM.
        addSizePreservingHelpers(this.mainTable, this.options);

        // Modify DOM to create divs to hold each subtable.
        if (!this._rootDiv) {
            const table = this.mainTable.table;
            this._rootDiv = table.parentElement!.insertBefore(document.createElement('div'), table);
            this._rootDiv.classList.add(CLASS_CONTAINER);
            createDivsForCopies(this._rootDiv, this.options);
        }

        // Create the frozen table copies and insert each one into its div.
        const allTables = insertTableCopies(this._rootDiv, this.mainTable, this.options);

        hideRedundantCells(allTables, this.options);

        // NOTE: Forces layout of header.
        // This couldn't be done earlier for a couple of reasons:
        // * If border-collapse: collapse, then splitting out the header may create a double-border that
        //   impacts the total table size.
        const headerOffsetHeight = this.getTableDiv('header', 'full')?.offsetHeight || 0;
        const totalOffsetHeight = this.getTableDiv('content', 'full')!.offsetHeight + headerOffsetHeight;
        const totalOffsetWidth = this.getTableDiv('content', 'full')!.querySelector('table')!.offsetWidth;
        const scrollbarWidth = getScrollbarWidth();
        this.layoutInfo = {totalOffsetWidth, totalOffsetHeight, scrollbarWidth, headerOffsetHeight};

        this.resize();

        this.setupEvents();
    }

    private setupEvents() {
        const divWithScrollbars = this.getTableDiv('content', 'full')!;

        divWithScrollbars.onscroll = (event: Event) => {
            const scrollTop = divWithScrollbars.scrollTop;
            const scrollLeft = divWithScrollbars.scrollLeft;

            let div;
            if (div = this.getTableDiv('header', 'full')) div.scrollLeft = scrollLeft;
            if (div = this.getTableDiv('content', 'left')) div.scrollTop = scrollTop;
            if (div = this.getTableDiv('footer', 'full')) div.scrollLeft = scrollLeft;
            if (this.options.onscroll) this.options.onscroll({scrollTop, scrollLeft});
        }

        // Ugh.  This doesn't work very well.

        // if (this.options.forwardWheel) {
        //     let frozenColumn;
        //     if (frozenColumn = this.getTableDiv('content', 'left')) {
        //         frozenColumn.onwheel = (event: WheelEvent) => {
        //             divWithScrollbars.scrollBy({
        //                 top: event.deltaY,
        //                 behavior: 'smooth',
        //             });
        //         };
        //     }
        // }
    }

    private getSuperRowDiv(superrow: SuperRow): HTMLElement | null {
        let superrowPath;
        if (superrow === 'header') superrowPath = CSS_PATH_SUPERROW_HEADER;
        else if (superrow === 'footer') superrowPath = CSS_PATH_SUPERROW_FOOTER;
        else if (superrow === 'content') superrowPath = CSS_PATH_SUPERROW_CONTENT;

        return this._rootDiv?.querySelector(`${superrowPath}`) || null;
    }

    private getTableDiv(
        superrow: SuperRow,
        subtable: Subtable,
    ): HTMLElement | null {
        let superrowPath, subtableClass;
        if (superrow === 'header') superrowPath = CSS_PATH_SUPERROW_HEADER;
        else if (superrow === 'footer') superrowPath = CSS_PATH_SUPERROW_FOOTER;
        else if (superrow === 'content') superrowPath = CSS_PATH_SUPERROW_CONTENT;

        if (subtable === 'full') subtableClass = CLASS_SUBTABLE_FULL;
        else if (subtable === 'left') subtableClass = CLASS_SUBTABLE_LEFT;
        else if (subtable === 'right') subtableClass = CLASS_SUBTABLE_RIGHT;

        return this._rootDiv?.querySelector(`${superrowPath} > .${subtableClass}`) || null;
    }

    /**
     * Get the maximum size that the table can occupy, based on its content.
     *
     * Ideally this should be used to set `max-width` and `max-height` on a resizable
     * container, to prevent the resize grip from visibly "detaching" from the table.
     *
     * `.enhance()` must be called prior to this.
     * */
    maxContainerSize() {
        if (!this.layoutInfo) {
            throw new Error('must call .enhance() first');
        }
        let {totalOffsetHeight, totalOffsetWidth, scrollbarWidth} = this.layoutInfo;
        return {
            width: totalOffsetWidth + scrollbarWidth,
            height: totalOffsetHeight + scrollbarWidth,
        };
    }

    /**
     * Quickly update the dimensions of the scrollable table's viewports to respond to a change
     * in e.g. container size.
     *
     * This method assumes that the content of the table itself has not changed at all. (or at least,
     * not in any way that should impact the layout of its cells).
     * */
    resize() {
        let {totalOffsetHeight, totalOffsetWidth, scrollbarWidth, headerOffsetHeight} = this.layoutInfo!;

        // width and height of the total space available for displaying the table.
        let {width: fullViewWidth, height: fullViewHeight} = computeDimensionsFromOptions(this.mainTable.table, this.options);

        // FIXME: bring back overflow = 'auto', or at least let user specify axes without scrollbars
        //
        //   This is a tricky problem.  If we want to determine whether scrollbars will appear we can't just compare
        //   e.g. clientWidth and scrollWidth because clientWidth will soon be invalidated (that's literally the
        //   entire point of this function!).
        //
        //   The original GridViewScroll kind of had support for it?  It was buggy though, and didn't account for
        //   "higher-order interactions" between scrollbars.  (e.g. imagine you have something perfectly fit to its
        //   content, then reduce its size along one axis.  When you do this, *both* scrollbars should appear, because
        //   the introduction of the first one will eat up space on the other axis)
        //
        //   ...bleh. It's just not worth it for now.
        this.getTableDiv('content', 'full')!.style.overflow = 'scroll';

        // ...clipped to prevent scrollbars from visibly detaching from the table when there is excess space on one axis
        fullViewHeight = Math.min(fullViewHeight, totalOffsetHeight + scrollbarWidth);
        fullViewWidth = Math.min(fullViewWidth, totalOffsetWidth + scrollbarWidth);

        // width and height of the visible viewport of the 'content/full' subtable, including portions that may be
        // obscured by the frozen left side or the footer. (one could also say contentViewWidth is the length of the
        // horizontal scrollbar, and likewise contentViewHeight for the vertical scrollbar).
        let contentViewWidth = fullViewWidth - scrollbarWidth;
        let contentViewHeight = fullViewHeight - scrollbarWidth - headerOffsetHeight;

        let div;
        if (div = this.getSuperRowDiv('header')) {
            div.style.position = 'relative';
            div.style.width = `${fullViewWidth}px`;
        }
        if (div = this.getSuperRowDiv('content')) {
            div.style.position = 'relative';
        }
        if (div = this.getSuperRowDiv('footer')) {
            div.style.position = 'absolute';
            div.style.bottom = `${scrollbarWidth}px`;
        }

        if (div = this.getTableDiv('header', 'full')) {
            div.style.overflow = 'hidden';
            div.style.width = `${contentViewWidth}px`;
            div.style.left = `0`;
        }
        if (div = this.getTableDiv('footer', 'full')) {
            div.style.overflow = 'hidden';
            div.style.width = `${contentViewWidth}px`;
            div.style.left = `0`;
        }

        if (div = this.getTableDiv('content', 'full')) {
            div.style.width = `${contentViewWidth}px`;
            div.style.height = `${fullViewHeight - headerOffsetHeight}px`;

            // Note: The original GridViewScroll did this if and only if *both* scrollbars were active,
            //       which sounds odd.  Not sure why; git blame reveals little.  Might need testing later.
            //       (But it doesn't matter right now due to "overflow: scroll".)
            if (getComputedStyle(div, null).direction === 'rtl') {
                div.style.paddingLeft = `${scrollbarWidth}px`;
            } else {
                div.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        if (div = this.getTableDiv('content', 'left')) {
            div.style.height = `${contentViewHeight}px`;
        }

        for (const superrow of <SuperRow[]>['header', 'content', 'footer']) {
            if (div = this.getTableDiv(superrow, 'left')) {
                div.style.overflow = 'hidden';
                div.style.position = 'absolute';
                div.style.left = '0';
                div.style.top = '0';
            }
        }
    }
}

function computeDimensionsFromOptions(table: HTMLTableElement, options: InternalOptions): {width: number, height: number} {
    if (options.container) {
        return {width: options.container.clientWidth, height: options.container.clientHeight};
    }

    let {width: argWidth, height: argHeight} = options;
    if (argWidth == null || argHeight == null) {
        throw new Error("Either container, or both width and height are required.")
    }

    let width;
    if (typeof argWidth === 'number') {
        width = argWidth;
    } else if (argWidth.indexOf("%") > -1) {
        const percentage = parseFloat(argWidth);
        width = table.parentElement!.offsetWidth * percentage / 100;
    } else {
        width = parseInt(argWidth);
    }

    let height;
    if (typeof argHeight === 'number') {
        height = argHeight;
    } else if (argHeight.indexOf("%") > -1) {
        const percentage = parseFloat(argHeight);
        height = table.parentElement!.offsetHeight * percentage / 100;
    } else {
        height = parseInt(argHeight);
    }

    return {width, height};
}

/** Adds CSS classes requested by the user to elements that will be frozen. */
function addUserCssClasses(tableElements: TableElements, options: InternalOptions) {
    const allRows = Array.from(tableElements.allRows());
    if (options.frozenHeaderCssClass) {
        for (const [,row] of allRows.slice(0, options.freezeHeaderRows)) {
            row.classList.add(options.frozenHeaderCssClass);
        }
    }

    if (options.frozenLeftCssClass) {
        for (const [,row] of allRows) {
            for (const elem of getFirstCells(row, options.freezeLeftColumns)) {
                elem.classList.add(options.frozenLeftCssClass);
            }
        }
    }

    if (options.frozenFooterCssClass) {
        for (const [,row] of allRows.slice(allRows.length - options.freezeHeaderRows, allRows.length)) {
            row.classList.add(options.frozenFooterCssClass);
        }
    }
}

/**
 * Wrap the content of some cells in helper divs that preserve their dimensions.
 *
 * In the copies of the table that we create for frozen cells, we will set width and height on these
 * divs based on their computed dimensions in the original table.  This ensures that the frozen copies
 * have the same row heights and column widths as the original despite missing parts of the table that
 * may have had an effect on these dimensions.
 * */
function addSizePreservingHelpers(tableElements: TableElements, options: InternalOptions) {
    // Idempotent function for ensuring that a table cell's contents are wrapped in a helper div.
    function ensureHelperDiv(cell: Element) {
        if (!(cell.firstElementChild && cell.firstElementChild.classList.contains(CLASS_SIZE_HELPER))) {
            const div = document.createElement('div');
            div.classList.add(CLASS_SIZE_HELPER);
            div.append(...cell.children);
            cell.append(div);
        }
    }

    // Make sure that the header, footer, and main table all have at least one row with helpers.
    const allRows = Array.from(tableElements.allRows());
    const [,lastRow] = allRows[allRows.length - 1]; // for footer and main table
    const [,firstRow] = allRows[0]; // for header
    for (const row of [firstRow, lastRow]) {
        for (const cell of row.querySelectorAll(':scope > td, :scope > th')) {
            ensureHelperDiv(cell);
        }
    }

    // Likewise with the full and side-tables.
    for (const [,row] of allRows) {
        const [firstCell] = getFirstCells(row, 1); // appears in both full and side-table
        ensureHelperDiv(firstCell);
    }

    // ------------------
    // Now that all of the helpers exist, we want to compute all of their dimensions and then
    // preserve these in their `width` and `height`.

    // First, in case these helpers are leftover from earlier (e.g. perhaps this is in a second
    // call to `enhance()` after table content changed), strip any old dimensions to ensure
    // optimal table layout is computed.
    const helpers = Array.from(allSizeHelpersInTable(tableElements.table));
    for (const div of helpers) {
        div.style.width = '';
        div.style.height = '';
    }

    // Compute dimensions of all helper divs before setting any of them, to minimize reflow.
    let sizes = helpers.map((elem) => ({width: elem.offsetWidth, height: elem.offsetHeight}));

    // Now record them in the helper divs' style so that, when portions of the table are later copied,
    // they remain the same size.
    for (let i = 0; i < helpers.length; i++) {
        helpers[i].style.width = `${sizes[i].width}px`;
        helpers[i].style.height = `${sizes[i].height}px`;
    }
}

function* allSizeHelpersInTable(table: HTMLTableElement) {
    for (const row of table.querySelectorAll(':scope > tr, :scope > * > tr')) {
        for (const cell of row.querySelectorAll(':scope > td, :scope > th')) {
            for (const div of cell.querySelectorAll(`:scope > .${CLASS_SIZE_HELPER}`)) {
                yield div as HTMLDivElement;
            }
        }
    }
}

function createDivsForCopies(rootContainer: HTMLElement, options: InternalOptions) {
    function makeSuperrow(superRowClass: string) {
        let superRowElem = document.createElement('div');
        superRowElem.classList.add(superRowClass);

        let fullDiv = document.createElement('div');
        fullDiv.classList.add(CLASS_SUBTABLE_FULL);
        fullDiv.style.overflow = (superRowClass === CLASS_SUPERROW_CONTENT) ? 'auto' : 'hidden';
        superRowElem.appendChild(fullDiv);

        if (options.freezeLeftColumns) {
            let leftDiv = document.createElement('div');
            leftDiv.classList.add(CLASS_SUBTABLE_LEFT);
            leftDiv.style.overflow = 'hidden';
            superRowElem.appendChild(leftDiv);
        }
        return superRowElem;
    }

    rootContainer.innerHTML = '';

    if (options.freezeHeaderRows) {
        rootContainer.appendChild(makeSuperrow(CLASS_SUPERROW_HEADER));
    }

    const contentElem = makeSuperrow(CLASS_SUPERROW_CONTENT);
    rootContainer.appendChild(contentElem);

    if (options.freezeHeaderRows) {
        contentElem.appendChild(makeSuperrow(CLASS_SUPERROW_FOOTER));
    }
}

function insertTableCopies(rootDiv: HTMLDivElement, tableElements: TableElements, options: InternalOptions) {
    const labeledRows = Array.from(tableElements.allRows());

    let content: SuperRowTables = {full: tableElements};
    let frozenHeader: SuperRowTables | undefined;
    if (options.freezeHeaderRows) {
        frozenHeader = {full: tableElements.emptyCopy()};
        for (const [where, row] of labeledRows.slice(0, options.freezeHeaderRows)) {
            frozenHeader.full.appendRow(where, row.cloneNode(true) as HTMLTableRowElement);
        }
    }
    let frozenFooter: SuperRowTables | undefined;
    if (options.freezeFooterRows) {
        frozenFooter = {full: tableElements.emptyCopy()};
        for (const [where, row] of labeledRows.slice(labeledRows.length - options.freezeFooterRows)) {
            frozenFooter.full.appendRow(where, row.cloneNode(true) as HTMLTableRowElement);
        }
    }

    // At this point we have (up to) three tables:  full table, frozen header, frozen bottom.
    //
    // Now for each of those, we also potentially build a frozen left part.
    if (options.freezeLeftColumns) {
        for (const superRow of [content, frozenHeader, frozenFooter]) {
            if (!superRow) continue;
            superRow.left = superRow.full.emptyCopy();

            for (const [where, row] of superRow.full.allRows()) {
                let frozenRow = row.cloneNode(false) as HTMLTableRowElement;
                for (const cell of getFirstCells(row, options.freezeLeftColumns)) {
                    frozenRow.appendChild(cell.cloneNode(true));
                }

                superRow.left.appendRow(where, frozenRow);
            }
        }
    }

    // Insert each table into its div
    let superRows: [SuperRowTables | undefined, string][] = [
        [content, CSS_PATH_SUPERROW_CONTENT],
        [frozenHeader, CSS_PATH_SUPERROW_HEADER],
        [frozenFooter, CSS_PATH_SUPERROW_FOOTER],
    ];
    for (const [tables, cssPath] of superRows) {
        if (!tables) continue;
        const fullDiv = rootDiv.querySelector(`${cssPath} > .${CLASS_SUBTABLE_FULL}`)!;
        fullDiv.innerHTML = '';
        fullDiv.appendChild(reconstructTableFromElements(tables.full));

        if (tables.left) {
            const leftDiv = rootDiv.querySelector(`${cssPath} > .${CLASS_SUBTABLE_LEFT}`)!;
            leftDiv.innerHTML = '';
            leftDiv.appendChild(reconstructTableFromElements(tables.left));
        }
    }
    return {content, frozenHeader, frozenFooter};
}

// Hide copies of header rows from the main table and it's frozen side-tables.
//
// (Nothing else needs to be hidden because everything else gets obscured behind the frozen copies.)
function hideRedundantCells(allTables: AllTables, options: InternalOptions) {
    for (const subtableKind of <Subtable[]>['full', 'left', 'right']) {
        const subtable = allTables.content[subtableKind];
        if (!subtable) continue;

        let allRows = Array.from(subtable.allRows());
        for (const [,row] of allRows.slice(0, options.freezeHeaderRows)) {
            row.style.display = 'none';
        }
    }
}

/**
 * A type with all information necessary to rebuild a table while preserving as much styling as possible
 * (except for information related to computed layout).
 * */
type TableElements = {
    // Content of the table.
    theadRows: HTMLTableRowElement[], // empty if theadElem is null
    tbodyRows: HTMLTableRowElement[],
    tfootRows: HTMLTableRowElement[], // empty if tfootElem is null

    // These are here so they can be shallow-cloned for attributes. (their children are ignored)
    table: HTMLTableElement,
    thead: HTMLElement | null,
    tbody: HTMLElement | null,
    tfoot: HTMLElement | null,

    // A couple of helper methods.
    allRows(): IterableIterator<[RowKind, HTMLTableRowElement]>,
    appendRow(where: RowKind, row: HTMLTableRowElement): void,
    /** Produce a copy with no rows. */
    emptyCopy(): TableElements,
};
/** Which HTML row group does a row belong to? */
type RowKind = 'thead' | 'tbody' | 'tfoot';

function getTableElements(table: HTMLTableElement): TableElements {
    const getTrChildren = (elem: Element) => Array.from(elem.querySelectorAll<HTMLTableRowElement>(':scope > tr'));

    let thead = table.querySelector<HTMLElement>(':scope > thead');
    let tbody = table.querySelector<HTMLElement>(':scope > tbody');
    let tfoot = table.querySelector<HTMLElement>(':scope > tfoot');

    let theadRows = thead ? getTrChildren(thead) : [];
    let tfootRows = tfoot ? getTrChildren(tfoot) : [];
    let tbodyRows = getTrChildren(tbody || table);

    return {
        table, theadRows, tbodyRows, tfootRows, thead, tbody, tfoot,
        allRows: function*(): IterableIterator<[RowKind, HTMLTableRowElement]> {
            for (const row of this.theadRows) yield ['thead', row];
            for (const row of this.tbodyRows) yield ['tbody', row];
            for (const row of this.tfootRows) yield ['tfoot', row];
        },
        emptyCopy: function() {
            let {table, thead, tbody, tfoot, allRows, emptyCopy, appendRow} = this;
            return {
                table, thead, tbody, tfoot,
                theadRows: [], tbodyRows: [], tfootRows: [],
                allRows, emptyCopy, appendRow,
            };
        },
        appendRow: function(where: RowKind, row: HTMLTableRowElement) {
            if (where === 'thead') this.theadRows.push(row);
            if (where === 'tbody') this.tbodyRows.push(row);
            if (where === 'tfoot') this.tfootRows.push(row);
        },
    };
}

/**
 * Build a new table from the TableElements.
 *
 * The rows will be moved inside.  The other elements are only shallow-copied.
 * */
function reconstructTableFromElements(tableElements: TableElements): HTMLTableElement {
    let {table, thead, tbody, tfoot, theadRows, tbodyRows, tfootRows} = tableElements;
    table = table.cloneNode(false) as HTMLTableElement;

    if (thead) {
        thead = thead.cloneNode(false) as HTMLElement;
        thead.append(...theadRows);
        table.appendChild(thead);
    }

    if (tbody) {
        tbody = tbody.cloneNode(false) as HTMLElement;
        tbody.append(...tbodyRows);
        table.appendChild(tbody);
    } else {
        table.append(...tbodyRows);
    }

    if (tfoot) {
        tfoot = tfoot.cloneNode(false) as HTMLElement;
        tfoot.append(...tfootRows);
        table.appendChild(tfoot);
    }

    return table;
}

/**
 * Get the cells that occupy the first `columnCount` columns of a row.
 *
 * A cell with `colSpan` will be included if any part of it is in-range.
 * */
function getFirstCells(row: HTMLTableRowElement, columnCount: number): HTMLTableCellElement[] {
    // NOTE: <script> and <template> are also valid inside <tr> and we don't want to include those
    let out = [];
    for (const child of row.querySelectorAll<HTMLTableCellElement>(':scope > td, :scope > th')) {
        if (columnCount <= 0) break;
        out.push(child);
        columnCount -= child.colSpan;
    }
    return out;
}

function getScrollbarWidth(): number {
    const innerElement = document.createElement('p');
    innerElement.style.width = "100%";
    innerElement.style.height = "200px";

    const outerElement = document.createElement('div');
    outerElement.style.position = "absolute";
    outerElement.style.top = "0px";
    outerElement.style.left = "0px";
    outerElement.style.visibility = "hidden";
    outerElement.style.width = "200px";
    outerElement.style.height = "150px";
    outerElement.style.overflow = "hidden";

    outerElement.appendChild(innerElement);

    document.body.appendChild(outerElement);

    const innerElementWidth = innerElement.offsetWidth;

    outerElement.style.overflow = 'scroll';

    let outerElementWidth = innerElement.offsetWidth;
    if (innerElementWidth === outerElementWidth) outerElementWidth = outerElement.clientWidth;

    document.body.removeChild(outerElement);

    return innerElementWidth - outerElementWidth;
}
