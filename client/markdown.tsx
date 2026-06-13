import clsx from 'clsx';
import { useEffect, useState } from 'react';
import production from 'react/jsx-runtime';
import rehypeReact from 'rehype-react';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeReact, production);

export function Markdown({ markdown, className, ...props }: { markdown: string } & React.ComponentProps<'div'>) {
  const [content, setContent] = useState<React.ReactElement>();

  useEffect(() => {
    setContent(processor.processSync(markdown).result as React.ReactElement);
  }, [markdown]);

  return (
    <div className={clsx('prose max-w-none prose-zinc dark:prose-invert text-inherit', className)} {...props}>
      {content}
    </div>
  );
}
