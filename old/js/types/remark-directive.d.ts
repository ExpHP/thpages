import type {Parent, PhrasingContent, BlockContent} from 'mdast';

export type Attributes = {
    [s: string]: string | undefined,
}

export interface Directive {
    name: string,
    attributes?: Attributes,
}

export interface TextDirective extends Parent, Directive {
    type: 'textDirective',
    children: PhrasingContent[],
}

export interface LeafDirective extends Parent, Directive {
    type: 'leafDirective',
    children: PhrasingContent[],
}

export interface ContainerDirective extends Parent, Directive {
    type: 'containerDirective',
    children: BlockContent[],
}
