import clsx from 'clsx';
import type { Root } from 'mdast';
import { useMemo } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import rehypeReact, { type Components } from 'rehype-react';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified, type Plugin } from 'unified';
import { visit } from 'unist-util-visit';

// cspell:words jsxs

export function Markdown({
  markdown,
  components,
  className,
  ...props
}: { markdown: string; components?: Partial<Components> } & React.ComponentProps<'div'>) {
  const { result } = useMemo(() => {
    return unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkCustomComponents)
      .use(remarkRehype)
      .use(rehypeReact, {
        Fragment: jsxRuntime.Fragment,
        jsx: jsxRuntime.jsx,
        jsxs: jsxRuntime.jsxs,
        components,
      })
      .processSync(markdown);
  }, [markdown, components]);

  return (
    <div className={clsx('prose max-w-none prose-zinc dark:prose-invert text-inherit', className)} {...props}>
      {result as React.ReactElement}
    </div>
  );
}

const remarkCustomComponents: Plugin = () => (tree: Root) => {
  visit(tree, ['textDirective', 'leafDirective', 'containerDirective'] as const, (node) => {
    node.data ??= {};
    node.data.hName = node.name;
    node.data.hProperties = node.attributes ?? {};
  });
};
