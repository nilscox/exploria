import clsx from 'clsx';
import { createContext, use, useId } from 'react';

const fieldContext = createContext<string | undefined>(undefined);

export function Field({ children }: { children: React.ReactNode }) {
  const id = useId();

  return (
    <fieldContext.Provider value={id}>
      <div className="col gap-1">{children}</div>
    </fieldContext.Provider>
  );
}

export function fieldProps() {
  const id = use(fieldContext);

  if (!id) {
    return {};
  }

  return {
    id,
    'aria-labelledby': `${id}-label`,
    'aria-errormessage': `${id}-error`,
  };
}

export function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  const id = use(fieldContext);

  return <label id={`${id}-label`} htmlFor={id} className={clsx(className, 'text-dim max-w-fit text-sm')} {...props} />;
}

export function FieldError({ className, ...props }: React.ComponentProps<'div'>) {
  const id = use(fieldContext);

  return <div id={`${id}-error`} className={clsx(className, 'text-red-600 text-sm')} {...props} />;
}
